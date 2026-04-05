const { pool } = require("../config/database");

exports.getFaq = async (req, res) => {
  try {
    res.json({
      faqs: [
        { id: 1, question: "What is SeniorShield?", answer: "SeniorShield is a mobile app designed specifically for seniors aged 65 and older. It provides a patient, warm voice assistant to help with everyday phone tasks, protects against scams, and keeps family members informed.", category: "General" },
        { id: 2, question: "How does the voice assistant work?", answer: "Simply tap the glowing orb on the home screen and speak your question or request. The assistant will guide you step-by-step through any phone task, from sending texts to making calls.", category: "Features" },
        { id: 3, question: "How does scam detection work?", answer: "Copy any suspicious email, text, or message and paste it into the Scam Check tab. Our AI analyzes it for known scam patterns and gives you a safety rating with a clear explanation.", category: "Features" },
        { id: 4, question: "What is the Family feature?", answer: "The Family feature lets you add trusted family members who get notified when something important happens, like a detected scam attempt or an emergency SOS. It keeps your loved ones in the loop.", category: "Features" },
        { id: 5, question: "How much does SeniorShield cost?", answer: "SeniorShield offers a free plan with basic features. The Premium plan ($9.99/month or $99.99/year) includes unlimited voice assistance, advanced scam detection, and more family member slots.", category: "Billing" },
        { id: 6, question: "How do I cancel my subscription?", answer: "Go to Settings, scroll down to your subscription section, and tap Cancel Subscription. Your premium features will remain active until the end of your current billing period.", category: "Billing" },
        { id: 7, question: "Is my data safe?", answer: "Yes. We use AES-256 encryption for all sensitive data, TLS for data in transit, and follow GDPR, CCPA, and ADA compliance standards. Your conversations are stored for 30 days and then automatically deleted.", category: "Privacy" },
        { id: 8, question: "Does SeniorShield work with hearing aids?", answer: "Yes! SeniorShield supports 8 major hearing aid brands covering 85% of the market, including ReSound, Phonak, Widex, Signia, Oticon, Unitron, Starkey, and Bernafon.", category: "Accessibility" },
      ],
    });
  } catch (err) {
    console.error("FAQ error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve FAQs" },
    });
  }
};

exports.getTutorials = async (req, res) => {
  try {
    res.json({
      tutorials: [
        { id: 1, title: "Getting Started with SeniorShield", description: "Learn how to set up your account and use the voice assistant for the first time.", duration: "5 minutes", category: "Basics" },
        { id: 2, title: "How to Check for Scams", description: "Learn how to copy suspicious messages and use the Scam Check feature to stay safe.", duration: "3 minutes", category: "Safety" },
        { id: 3, title: "Adding Family Members", description: "Learn how to add trusted family members so they get notified when you need help.", duration: "3 minutes", category: "Family" },
        { id: 4, title: "Customizing Your Settings", description: "Learn how to change text size, voice preferences, and appearance to suit your needs.", duration: "4 minutes", category: "Settings" },
        { id: 5, title: "Connecting Your Hearing Aid", description: "Step-by-step guide to connecting and configuring your hearing aid with SeniorShield.", duration: "5 minutes", category: "Accessibility" },
        { id: 6, title: "Using the Emergency Feature", description: "Learn how to quickly access emergency numbers and send SOS alerts to your family.", duration: "2 minutes", category: "Safety" },
      ],
    });
  } catch (err) {
    console.error("Tutorials error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve tutorials" },
    });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { subject, description, category } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "subject and description are required" },
      });
    }

    const ticketId = require("uuid").v4();

    res.status(201).json({
      ticket_id: ticketId,
      status: "OPEN",
    });
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not create ticket" },
    });
  }
};

exports.getTicket = async (req, res) => {
  try {
    res.json({
      ticket_id: req.params.ticket_id,
      subject: "Support ticket",
      description: "Ticket details",
      status: "OPEN",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Get ticket error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve ticket" },
    });
  }
};
