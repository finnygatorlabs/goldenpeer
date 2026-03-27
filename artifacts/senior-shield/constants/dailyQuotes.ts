export interface DailyQuote {
  text: string;
  author: string;
}

const DAILY_QUOTES: DailyQuote[] = [
  { text: "If you are going through hell, keep going.", author: "Winston Churchill" },
  { text: "Every strike brings me closer to the next home run.", author: "Babe Ruth" },
  { text: "Why not go out on a limb? That's where the fruit is.", author: "Mark Twain" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
  { text: "Only I can change my life. No one can do it for me.", author: "Carol Burnett" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "Life is about making an impact, not making an income.", author: "Kevin Kruse" },
  { text: "Happiness is the key to success.", author: "Albert Schweitzer" },
  { text: "Don't let a bad day make you think you have a bad life.", author: "Unknown" },
  { text: "To fall seven times, to get up eight.", author: "Japanese Proverb" },
  { text: "Make the iron hot by striking.", author: "William Butler Yeats" },
  { text: "Turn the invisible into the visible.", author: "Tony Robbins" },
  { text: "Your thoughts shape the happiness of your life.", author: "Marcus Aurelius" },
  { text: "It does not matter how slowly you go, so long as you do not stop.", author: "Confucius" },
  { text: "The second best time to plant a tree is now.", author: "Chinese Proverb" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "What lies within us is what truly matters.", author: "Ralph Waldo Emerson" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
  { text: "You are never too old to set another goal or dream a new dream.", author: "C.S. Lewis" },
  { text: "Keep your face toward the sunshine.", author: "Walt Whitman" },
  { text: "The purpose of life is a life of purpose.", author: "Robert Byrne" },
  { text: "It's not the goal — it's who you become reaching it.", author: "Zig Ziglar" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Hardships prepare ordinary people for greatness.", author: "C.S. Lewis" },
  { text: "The mind is everything. What you think, you become.", author: "Buddha" },
  { text: "With the new day comes new strength and new thoughts.", author: "Eleanor Roosevelt" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "A smooth sea never made a skilled sailor.", author: "Franklin D. Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "We become what we think about most of the time.", author: "Earl Nightingale" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "The best way to predict the future is to create it.", author: "Abraham Lincoln" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
  { text: "Happiness depends upon ourselves.", author: "Aristotle" },
  { text: "Our only limit is our doubt.", author: "Franklin D. Roosevelt" },
  { text: "Life shrinks or expands in proportion to one's courage.", author: "Anaïs Nin" },
  { text: "Try to be a rainbow in someone's cloud.", author: "Maya Angelou" },
  { text: "We rise by lifting others.", author: "Robert Ingersoll" },
  { text: "Nothing is impossible. The word itself says 'I'm possible!'", author: "Audrey Hepburn" },
  { text: "Success is moving from failure to failure without losing heart.", author: "Winston Churchill" },
  { text: "Your present circumstances don't determine where you can go.", author: "Unknown" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "What we achieve inwardly will change outer reality.", author: "Plutarch" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  { text: "Perseverance is many short races, one after the other.", author: "Walter Elliot" },
  { text: "You don't have to be great to start — just start.", author: "Zig Ziglar" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "When you have a dream, you've got to grab it and never let go.", author: "Carol Burnett" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
];

export function getDailyQuote(): DailyQuote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

export default DAILY_QUOTES;
