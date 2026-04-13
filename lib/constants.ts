export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const suggestions = [
  "How do I politely decline a wedding invitation?",
  "What should I wear to a business dinner?",
  "How do I write a heartfelt thank-you note?",
  "What's the best way to introduce people at a party?",
  "How do I handle a difficult conversation with a family member?",
  "What are the basics of being a great dinner guest?",
];
