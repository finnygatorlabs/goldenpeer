import { Router, IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { scamAnalysisTable, scamDetectionFeedbackTable, scamLibraryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import fs from "fs/promises";

const upload = multer({
  dest: "/tmp/scam-uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router: IRouter = Router();

const URGENCY_KEYWORDS = [
  "urgent", "urgent action required", "act now", "immediate action", "immediate",
  "immediately", "today", "right now", "asap", "hurry", "quickly", "fast",
  "deadline", "time-sensitive", "expiring", "expires soon", "limited time",
  "last chance", "do not delay", "verify now", "confirm now", "respond immediately",
  "within 24 hours", "within 48 hours", "action required",
];

const FINANCIAL_KEYWORDS = [
  "payment", "pay", "paid", "payment required", "transfer", "wire", "wire transfer",
  "account", "account number", "card", "credit card", "debit card", "billing", "bill",
  "invoice", "charge", "charged", "balance", "low balance", "refund", "refund pending",
  "deposit", "withdrawal", "transaction", "transaction failed", "gift card", "bitcoin",
  "cryptocurrency", "cash app", "venmo", "zelle", "western union", "money order",
  "send money", "send $",
];

const AUTHORITY_KEYWORDS = [
  "irs", "internal revenue service", "bank", "banking", "amazon", "apple", "microsoft",
  "google", "paypal", "ebay", "walmart", "social security", "ssa", "fbi", "police",
  "law enforcement", "government", "federal", "official", "official notice",
  "administrator", "support", "customer service", "security department", "fraud department",
  "medicare", "medicaid", "department of justice", "treasury",
];

const THREAT_KEYWORDS = [
  "suspended", "suspend", "suspension", "locked", "lock", "locked out",
  "compromised", "compromise", "fraud", "fraudulent", "fraudulent activity",
  "unauthorized", "unauthorized access", "hacked", "hacking", "security breach",
  "virus", "malware", "infected", "risk", "at risk", "dangerous",
  "alert", "warning", "critical alert", "your account will be closed",
  "legal action", "arrest", "warrant", "penalty", "fine",
];

const REQUEST_KEYWORDS = [
  "password", "enter password", "pin", "enter pin", "social security number", "ssn",
  "account number", "credit card number", "card number", "verification code",
  "verify code", "confirm identity", "verify identity", "click here", "click link",
  "download", "install", "call this number", "call us", "call immediately",
  "provide your", "share your", "send your", "enter your", "update your information",
  "verify your account", "confirm your account",
];

const IMPERSONATION_KEYWORDS = [
  "on behalf of", "official message", "authorized by", "verified by",
  "from the desk of", "this is a notice from", "we are contacting you",
  "your account with", "as your provider", "security team",
];

const KNOWN_COMPANIES = [
  { name: "amazon", domains: ["amazon.com", "amazon.co.uk", "amazon.ca"] },
  { name: "apple", domains: ["apple.com", "icloud.com"] },
  { name: "microsoft", domains: ["microsoft.com", "outlook.com", "live.com", "hotmail.com"] },
  { name: "google", domains: ["google.com", "gmail.com"] },
  { name: "paypal", domains: ["paypal.com"] },
  { name: "ebay", domains: ["ebay.com"] },
  { name: "walmart", domains: ["walmart.com"] },
  { name: "netflix", domains: ["netflix.com"] },
  { name: "facebook", domains: ["facebook.com", "meta.com"] },
  { name: "chase", domains: ["chase.com", "jpmorgan.com"] },
  { name: "bank of america", domains: ["bankofamerica.com"] },
  { name: "wells fargo", domains: ["wellsfargo.com"] },
  { name: "citibank", domains: ["citibank.com", "citi.com"] },
  { name: "usps", domains: ["usps.com"] },
  { name: "fedex", domains: ["fedex.com"] },
  { name: "ups", domains: ["ups.com"] },
  { name: "irs", domains: ["irs.gov"] },
  { name: "social security", domains: ["ssa.gov"] },
];

const SUSPICIOUS_TLDS = [
  ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".buzz", ".club",
  ".work", ".click", ".link", ".info", ".win", ".bid", ".stream",
];

const URL_SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "buff.ly",
  "ow.ly", "adf.ly", "short.link", "rb.gy", "cutt.ly", "v.gd",
];

interface ExtractedEntities {
  emails: string[];
  urls: string[];
  phones: string[];
  amounts: string[];
  senderEmail: string | null;
  senderDomain: string | null;
}

interface LayerResult {
  name: string;
  score: number;
  maxScore: number;
  findings: string[];
}

interface FullAnalysis {
  risk_score: number;
  risk_level: "safe" | "low_risk" | "medium_risk" | "high_risk" | "critical_risk";
  confidence: number;
  detected_patterns: string[];
  explanation: string;
  layers: LayerResult[];
  entities: ExtractedEntities;
  keywords_detected: string[];
  recommendation: string;
}

function extractEntities(text: string): ExtractedEntities {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const amountRegex = /\$[\d,]+(?:\.\d{2})?|\d+\s*(?:dollars?|usd)/gi;

  const emails = [...new Set((text.match(emailRegex) || []).map(e => e.toLowerCase()))];
  const urls = [...new Set(text.match(urlRegex) || [])];
  const phones = [...new Set(text.match(phoneRegex) || [])];
  const amounts = [...new Set(text.match(amountRegex) || [])];

  let senderEmail: string | null = null;
  let senderDomain: string | null = null;
  const fromMatch = text.match(/(?:from|sender|reply-to)\s*:?\s*<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
  if (fromMatch) {
    senderEmail = fromMatch[1].toLowerCase();
    senderDomain = senderEmail.split("@")[1];
  } else if (emails.length > 0) {
    senderEmail = emails[0];
    senderDomain = senderEmail.split("@")[1];
  }

  return { emails, urls, phones, amounts, senderEmail, senderDomain };
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeHomoglyphs(s: string): string {
  return s
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/5/g, "s")
    .replace(/\|/g, "l")
    .replace(/!/g, "i");
}

function countKeywordHits(text: string, keywords: string[], maxPoints: number, perHit: number): { score: number; matched: string[] } {
  const lower = text.toLowerCase();
  let score = 0;
  const matched: string[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      score += perHit;
      matched.push(kw);
      if (score >= maxPoints) { score = maxPoints; break; }
    }
  }
  return { score, matched };
}

function layer1_keywords(text: string): LayerResult & { allMatched: string[] } {
  const findings: string[] = [];
  const allMatched: string[] = [];
  let score = 0;

  const urgency = countKeywordHits(text, URGENCY_KEYWORDS, 10, 5);
  if (urgency.score > 0) { score += urgency.score; findings.push(`Urgency language detected: ${urgency.matched.join(", ")}`); allMatched.push(...urgency.matched); }

  const financial = countKeywordHits(text, FINANCIAL_KEYWORDS, 9, 3);
  if (financial.score > 0) { score += financial.score; findings.push(`Financial language detected: ${financial.matched.join(", ")}`); allMatched.push(...financial.matched); }

  const authority = countKeywordHits(text, AUTHORITY_KEYWORDS, 12, 4);
  if (authority.score > 0) { score += authority.score; findings.push(`Authority/brand references: ${authority.matched.join(", ")}`); allMatched.push(...authority.matched); }

  const threat = countKeywordHits(text, THREAT_KEYWORDS, 15, 5);
  if (threat.score > 0) { score += threat.score; findings.push(`Threat language detected: ${threat.matched.join(", ")}`); allMatched.push(...threat.matched); }

  const impersonation = countKeywordHits(text, IMPERSONATION_KEYWORDS, 12, 6);
  if (impersonation.score > 0) { score += impersonation.score; findings.push(`Impersonation language: ${impersonation.matched.join(", ")}`); allMatched.push(...impersonation.matched); }

  const request = countKeywordHits(text, REQUEST_KEYWORDS, 16, 8);
  if (request.score > 0) { score += request.score; findings.push(`Sensitive information requests: ${request.matched.join(", ")}`); allMatched.push(...request.matched); }

  return { name: "Keyword Detection", score: Math.min(score, 30), maxScore: 30, findings, allMatched };
}

function layer2_patterns(text: string): LayerResult & { patternNames: string[] } {
  const lower = text.toLowerCase();
  let score = 0;
  const findings: string[] = [];
  const patternNames: string[] = [];

  const phishingPhrases = ["verify your account", "confirm your identity", "update your information", "confirm your account", "verify your identity", "restore access", "reactivate your account"];
  if (phishingPhrases.some(p => lower.includes(p))) {
    score += 15; findings.push("Phishing pattern: requests account verification or identity confirmation"); patternNames.push("phishing");
  }

  const urgencyCount = URGENCY_KEYWORDS.filter(k => lower.includes(k)).length;
  const hasFinancial = FINANCIAL_KEYWORDS.some(k => lower.includes(k));
  if (urgencyCount >= 3 && hasFinancial) {
    score += 10; findings.push("Urgency scam pattern: multiple urgency keywords combined with financial request"); patternNames.push("urgency_scam");
  }

  const requestPhrases = ["password", "pin", "ssn", "social security number", "account number", "credit card number", "card number", "routing number"];
  if (requestPhrases.some(p => lower.includes(p))) {
    score += 20; findings.push("Requests sensitive personal information (password, SSN, account number, etc.)"); patternNames.push("personal_info_request");
  }

  const techSupport = (lower.includes("virus") || lower.includes("malware") || lower.includes("infected")) &&
    (lower.includes("call") || lower.includes("download") || lower.includes("install"));
  if (techSupport) {
    score += 15; findings.push("Tech support scam pattern: claims device is infected and asks to call or download"); patternNames.push("tech_support_scam");
  }

  const romance = (lower.includes("love") || lower.includes("miss you") || lower.includes("darling")) &&
    (lower.includes("send money") || lower.includes("wire") || lower.includes("gift card") || lower.includes("western union"));
  if (romance) {
    score += 15; findings.push("Romance scam pattern: emotional language combined with money requests"); patternNames.push("romance_scam");
  }

  const lottery = (lower.includes("won") || lower.includes("winner") || lower.includes("congratulations") || lower.includes("prize")) &&
    (lower.includes("claim") || lower.includes("fee") || lower.includes("processing") || lower.includes("send"));
  if (lottery) {
    score += 15; findings.push("Lottery/prize scam pattern: claims you won something and asks for payment"); patternNames.push("lottery_scam");
  }

  const grandparent = (lower.includes("grandma") || lower.includes("grandpa") || lower.includes("grandmother") || lower.includes("grandfather") || lower.includes("nana") || lower.includes("papa")) &&
    (lower.includes("jail") || lower.includes("hospital") || lower.includes("trouble") || lower.includes("accident") || lower.includes("help me")) &&
    (lower.includes("money") || lower.includes("send") || lower.includes("bail") || lower.includes("$") || lower.includes("gift card"));
  if (grandparent) {
    score += 20; findings.push("Grandparent scam pattern: claims to be a family member in an emergency needing money"); patternNames.push("grandparent_scam");
  }

  const dontTell = lower.includes("don't tell") || lower.includes("do not tell") || lower.includes("keep this secret") || lower.includes("don't let anyone know");
  if (dontTell && (lower.includes("money") || lower.includes("send") || lower.includes("$"))) {
    score += 15; findings.push("Secrecy pressure: asks you not to tell family members — a major red flag"); patternNames.push("secrecy_pressure");
  }

  const legalThreat = (lower.includes("legal action") || lower.includes("arrest") || lower.includes("warrant") || lower.includes("lawsuit") || lower.includes("prosecution")) &&
    (lower.includes("immediately") || lower.includes("today") || lower.includes("urgent") || lower.includes("call"));
  if (legalThreat) {
    score += 15; findings.push("Legal threat scam: threatens arrest, lawsuit, or legal action to create panic"); patternNames.push("legal_threat_scam");
  }

  return { name: "Pattern Matching", score: Math.min(score, 25), maxScore: 25, findings, patternNames };
}

function layer3_links(urls: string[], entities: ExtractedEntities): LayerResult {
  let score = 0;
  const findings: string[] = [];

  for (const url of urls) {
    let hostname = "";
    try { hostname = new URL(url).hostname.toLowerCase(); } catch { hostname = url.toLowerCase(); }

    if (URL_SHORTENERS.some(s => hostname.includes(s))) {
      score += 8; findings.push(`Shortened URL detected: ${url.substring(0, 60)}`);
    }

    if (SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld))) {
      score += 10; findings.push(`Suspicious domain extension: ${hostname}`);
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
      score += 15; findings.push(`URL uses IP address instead of domain name: suspicious`);
    }

    const subdomains = hostname.split(".");
    if (subdomains.length > 3) {
      score += 10; findings.push(`Unusually many subdomains in URL: ${hostname}`);
    }

    if (url.includes("@")) {
      score += 15; findings.push(`URL contains @ symbol — may redirect to a different site`);
    }

    if (/%[0-9A-Fa-f]{2}/.test(url) && (url.includes("%2F") || url.includes("%3D") || url.includes("%3F"))) {
      score += 8; findings.push(`URL contains encoded characters — may be hiding the real destination`);
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:") {
        score += 5; findings.push(`URL uses HTTP instead of HTTPS — connection is not secure`);
      }
    } catch {}

    for (const company of KNOWN_COMPANIES) {
      const companyInUrl = hostname.includes(company.name.replace(/\s/g, ""));
      const isLegit = company.domains.some(d => hostname === d || hostname.endsWith("." + d));
      if (companyInUrl && !isLegit) {
        score += 15; findings.push(`Domain spoofing: URL mentions "${company.name}" but is not from their official domain`);
        break;
      }

      for (const domain of company.domains) {
        const baseDomain = domain.split(".")[0];
        const hostBase = hostname.split(".").slice(-2, -1)[0] || "";
        const normalized = normalizeHomoglyphs(hostBase);
        const dist = levenshtein(normalized, baseDomain);
        if (dist > 0 && dist <= 2 && !isLegit) {
          score += 12; findings.push(`Typosquatting detected: "${hostname}" looks similar to "${domain}" (possible impersonation)`);
          break;
        }
      }
    }
  }

  return { name: "Link Analysis", score: Math.min(score, 20), maxScore: 20, findings };
}

function layer4_sender(entities: ExtractedEntities, text: string): LayerResult {
  const lower = text.toLowerCase();
  let score = 0;
  const findings: string[] = [];

  if (entities.senderDomain) {
    for (const company of KNOWN_COMPANIES) {
      const mentionsCompany = lower.includes(company.name);
      const isLegitDomain = company.domains.some(d => entities.senderDomain === d || entities.senderDomain!.endsWith("." + d));

      if (mentionsCompany && !isLegitDomain) {
        score += 15; findings.push(`Sender domain "${entities.senderDomain}" does not match ${company.name}'s official domain (${company.domains[0]})`);
        break;
      }

      if (entities.senderDomain) {
        const senderBase = entities.senderDomain.split(".").slice(-2, -1)[0] || "";
        const normalized = normalizeHomoglyphs(senderBase);
        for (const d of company.domains) {
          const dBase = d.split(".")[0];
          const dist = levenshtein(normalized, dBase);
          if (dist > 0 && dist <= 2 && !isLegitDomain) {
            score += 12; findings.push(`Sender domain "${entities.senderDomain}" looks suspiciously similar to "${d}" — possible spoofing`);
            break;
          }
        }
      }
    }
  } else {
    const claimsCompany = KNOWN_COMPANIES.some(c => lower.includes(c.name));
    if (claimsCompany) {
      score += 5; findings.push("Message references a known company but no verifiable sender information found");
    }
  }

  if (entities.phones.length > 0 && (lower.includes("call") || lower.includes("dial") || lower.includes("reach us"))) {
    const callToAction = URGENCY_KEYWORDS.some(k => lower.includes(k));
    if (callToAction) {
      score += 5; findings.push("Urges you to call a phone number with urgency — legitimate companies rarely do this");
    }
  }

  return { name: "Sender Analysis", score: Math.min(score, 15), maxScore: 15, findings };
}

function layer5_context(text: string, entities: ExtractedEntities, keywordScore: number, patternScore: number): LayerResult {
  const lower = text.toLowerCase();
  let score = 0;
  const findings: string[] = [];

  if (keywordScore >= 15 && patternScore >= 10) {
    score += 5; findings.push("Multiple threat categories detected simultaneously — a strong scam indicator");
  }

  const hasGiftCard = lower.includes("gift card") || lower.includes("itunes card") || lower.includes("google play card") || lower.includes("steam card");
  if (hasGiftCard) {
    score += 5; findings.push("Mentions gift cards as payment — legitimate companies and agencies never ask for gift card payments");
  }

  if (entities.amounts.length > 0 && URGENCY_KEYWORDS.some(k => lower.includes(k))) {
    score += 3; findings.push("Combines specific dollar amounts with urgency language");
  }

  const allCapsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
  if (allCapsWords >= 3) {
    score += 2; findings.push("Excessive use of ALL CAPS — a common pressure tactic in scams");
  }

  return { name: "Contextual Analysis", score: Math.min(score, 10), maxScore: 10, findings };
}

function analyzeScamText(text: string): FullAnalysis {
  const entities = extractEntities(text);

  const l1 = layer1_keywords(text);
  const l2 = layer2_patterns(text);
  const l3 = layer3_links(entities.urls, entities);
  const l4 = layer4_sender(entities, text);
  const l5 = layer5_context(text, entities, l1.score, l2.score);

  const rawScore = l1.score + l2.score + l3.score + l4.score + l5.score;
  const riskScore = Math.min(rawScore, 100);

  let risk_level: FullAnalysis["risk_level"];
  if (riskScore <= 20) risk_level = "safe";
  else if (riskScore <= 40) risk_level = "low_risk";
  else if (riskScore <= 60) risk_level = "medium_risk";
  else if (riskScore <= 80) risk_level = "high_risk";
  else risk_level = "critical_risk";

  const confidence = Math.min(0.5 + (riskScore / 200) + (l2.patternNames.length * 0.05) + (l3.findings.length * 0.03), 0.99);

  const allPatterns = [...l2.patternNames];
  if (l1.allMatched.some(k => URGENCY_KEYWORDS.includes(k))) allPatterns.push("urgency");
  if (l1.allMatched.some(k => FINANCIAL_KEYWORDS.includes(k))) allPatterns.push("financial_language");
  if (l1.allMatched.some(k => AUTHORITY_KEYWORDS.includes(k))) allPatterns.push("authority_impersonation");
  if (l1.allMatched.some(k => THREAT_KEYWORDS.includes(k))) allPatterns.push("threat_language");
  if (l1.allMatched.some(k => REQUEST_KEYWORDS.includes(k))) allPatterns.push("sensitive_info_request");
  if (l3.findings.length > 0) allPatterns.push("suspicious_links");
  if (l4.findings.length > 0) allPatterns.push("sender_spoofing");

  const detected_patterns = [...new Set(allPatterns)];

  const layers: LayerResult[] = [
    { name: l1.name, score: l1.score, maxScore: l1.maxScore, findings: l1.findings },
    { name: l2.name, score: l2.score, maxScore: l2.maxScore, findings: l2.findings },
    { name: l3.name, score: l3.score, maxScore: l3.maxScore, findings: l3.findings },
    { name: l4.name, score: l4.score, maxScore: l4.maxScore, findings: l4.findings },
    { name: l5.name, score: l5.score, maxScore: l5.maxScore, findings: l5.findings },
  ];

  let explanation: string;
  let recommendation: string;

  if (risk_level === "safe") {
    explanation = "This message appears safe. No significant scam indicators were detected. Always stay cautious and never share personal information with someone who contacts you unexpectedly.";
    recommendation = "This looks safe, but always be cautious with unexpected messages.";
  } else if (risk_level === "low_risk") {
    const details = layers.flatMap(l => l.findings).slice(0, 2).join(". Also, ");
    explanation = `This message has a few minor warning signs: ${details}. It might be legitimate, but proceed with caution. If you are unsure, ask a family member to look at it before responding.`;
    recommendation = "Probably safe, but worth having a family member take a second look.";
  } else if (risk_level === "medium_risk") {
    const details = layers.flatMap(l => l.findings).slice(0, 3).join(". Additionally, ");
    explanation = `This message has several suspicious characteristics: ${details}. Do not click any links or provide personal information until you can verify who actually sent this message. Contact the company directly using a phone number you already have, not the one in the message.`;
    recommendation = "Be very cautious. Do not respond or click any links until verified.";
  } else if (risk_level === "high_risk") {
    const details = layers.flatMap(l => l.findings).slice(0, 4).join(". Furthermore, ");
    explanation = `WARNING: This message shows multiple high-risk scam indicators. ${details}. Do NOT click any links, call any numbers in the message, or provide any personal or financial information. This is very likely a scam attempt.`;
    recommendation = "Do NOT respond, click links, or share any information. This is very likely a scam.";
  } else {
    const details = layers.flatMap(l => l.findings).slice(0, 5).join(". ");
    explanation = `CRITICAL WARNING: This message is almost certainly a scam. ${details}. Do NOT interact with this message in any way. Do not click links, call numbers, send money, or share any information. Delete this message immediately. Your family has been notified.`;
    recommendation = "This is almost certainly a scam. Delete this message immediately. Your family has been notified.";
  }

  return {
    risk_score: riskScore,
    risk_level,
    confidence: Math.round(confidence * 100) / 100,
    detected_patterns,
    explanation,
    layers,
    entities,
    keywords_detected: l1.allMatched,
    recommendation,
  };
}

router.post("/analyze", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Bad Request", message: "text is required" });
      return;
    }

    const analysis = analyzeScamText(text);

    const [saved] = await db.insert(scamAnalysisTable).values({
      user_id: req.user!.userId,
      extracted_text: text,
      risk_score: analysis.risk_score.toString(),
      risk_level: analysis.risk_level,
      analysis_details: {
        layers: analysis.layers,
        entities: analysis.entities,
        keywords_detected: analysis.keywords_detected,
        detected_patterns: analysis.detected_patterns,
        confidence: analysis.confidence,
      },
    }).returning();

    res.json({
      id: saved.id,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      confidence: analysis.confidence,
      detected_patterns: analysis.detected_patterns,
      explanation: analysis.explanation,
      recommendation: analysis.recommendation,
      layers: analysis.layers,
      entities: {
        urls: analysis.entities.urls,
        phones: analysis.entities.phones,
        emails: analysis.entities.emails,
        amounts: analysis.entities.amounts,
        senderEmail: analysis.entities.senderEmail,
      },
      keywords_detected: analysis.keywords_detected,
    });
  } catch (err) {
    req.log.error({ err }, "Scam analyze error");
    res.status(500).json({ error: "Internal Server Error", message: "Could not analyze message" });
  }
});

router.post("/analyze-attachment", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    const additionalText = req.body?.text || "";

    if (!file && !additionalText) {
      res.status(400).json({ error: "Bad Request", message: "A file or text is required" });
      return;
    }

    let extractedText = additionalText;

    if (file) {
      try {
        if (file.mimetype === "text/plain") {
          const content = await fs.readFile(file.path, "utf-8");
          extractedText = extractedText ? `${extractedText}\n\n--- Attached file content ---\n${content}` : content;
        } else if (file.mimetype === "application/pdf") {
          extractedText = extractedText
            ? `${extractedText}\n\n[PDF file attached: ${file.originalname}]`
            : `[PDF file attached: ${file.originalname}]`;
        } else if (file.mimetype.startsWith("image/")) {
          extractedText = extractedText
            ? `${extractedText}\n\n[Image attached: ${file.originalname}]`
            : `[Image attached: ${file.originalname}]`;
        }
      } finally {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    if (!extractedText.trim()) {
      res.status(400).json({ error: "Bad Request", message: "No analyzable content found" });
      return;
    }

    const analysis = analyzeScamText(extractedText);

    const [saved] = await db.insert(scamAnalysisTable).values({
      user_id: req.user!.userId,
      extracted_text: extractedText,
      risk_score: analysis.risk_score.toString(),
      risk_level: analysis.risk_level,
      analysis_details: {
        layers: analysis.layers,
        entities: analysis.entities,
        keywords_detected: analysis.keywords_detected,
        detected_patterns: analysis.detected_patterns,
        confidence: analysis.confidence,
      },
    }).returning();

    res.json({
      id: saved.id,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      confidence: analysis.confidence,
      detected_patterns: analysis.detected_patterns,
      explanation: analysis.explanation,
      recommendation: analysis.recommendation,
      layers: analysis.layers,
      entities: {
        urls: analysis.entities.urls,
        phones: analysis.entities.phones,
        emails: analysis.entities.emails,
        amounts: analysis.entities.amounts,
        senderEmail: analysis.entities.senderEmail,
      },
      keywords_detected: analysis.keywords_detected,
      attachment_info: file ? {
        filename: file.originalname,
        type: file.mimetype,
        size: file.size,
      } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Scam analyze-attachment error");
    res.status(500).json({ error: "Internal Server Error", message: "Could not analyze attachment" });
  }
});

router.get("/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const history = await db
      .select()
      .from(scamAnalysisTable)
      .where(eq(scamAnalysisTable.user_id, req.user!.userId))
      .orderBy(desc(scamAnalysisTable.created_at))
      .limit(20);

    res.json({
      history: history.map(h => ({
        id: h.id,
        extracted_text: h.extracted_text,
        risk_score: h.risk_score,
        risk_level: h.risk_level,
        user_feedback: h.user_feedback,
        created_at: h.created_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Scam history error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/feedback", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { scam_analysis_id, feedback_type, explanation } = req.body;
    if (!scam_analysis_id || !feedback_type) {
      res.status(400).json({ error: "Bad Request", message: "scam_analysis_id and feedback_type are required" });
      return;
    }

    await db.insert(scamDetectionFeedbackTable).values({
      user_id: req.user!.userId,
      scam_analysis_id,
      feedback_type,
      explanation,
    });

    await db
      .update(scamAnalysisTable)
      .set({ user_feedback: feedback_type })
      .where(eq(scamAnalysisTable.id, scam_analysis_id));

    res.json({ success: true, message: "Feedback recorded. Thank you for helping improve scam detection!" });
  } catch (err) {
    req.log.error({ err }, "Scam feedback error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/history/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [entry] = await db.select().from(scamAnalysisTable)
      .where(eq(scamAnalysisTable.id, req.params.id))
      .limit(1);

    if (!entry || entry.user_id !== req.user!.userId) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json(entry);
  } catch (err) {
    req.log.error({ err }, "Scam detail error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/library", async (_req, res) => {
  try {
    const patterns = await db.select().from(scamLibraryTable).orderBy(desc(scamLibraryTable.created_at));
    res.json({ patterns });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/library", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pattern_name, keywords, description } = req.body;
    if (!pattern_name) {
      res.status(400).json({ error: "Bad Request", message: "pattern_name is required" });
      return;
    }

    const [pattern] = await db.insert(scamLibraryTable).values({
      pattern_name,
      keywords: keywords || [],
      description: description || null,
    }).returning();

    res.status(201).json({ pattern_id: pattern.id });
  } catch (err) {
    req.log.error({ err }, "Add scam library pattern error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/report", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { analysis_id, report_type, additional_info } = req.body;
    if (!report_type) {
      res.status(400).json({ error: "Bad Request", message: "report_type is required" });
      return;
    }

    res.json({
      success: true,
      report_submitted: true,
      message: "Thank you for reporting this scam. Your report helps protect others.",
    });
  } catch (err) {
    req.log.error({ err }, "Scam report error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
