// Semantic color definitions for the Monty financial tracker
export const colors = {
  // Semantic colors for financial data
  income: {
    light: '#e6f7ed',
    main: '#2f9e44',
    dark: '#1e6f30',
  },
  expense: {
    light: '#ffe6e6',
    main: '#fa5252',
    dark: '#c92a2a',
  },
  savings: {
    light: '#e6f4ff',
    main: '#228be6',
    dark: '#1864ab',
  },
  
  // Budget status colors
  budgetStatus: {
    safe: '#2f9e44',      // < 50% used
    warning: '#fab005',   // 50-75% used
    danger: '#fa5252',    // > 75% used
    over: '#c92a2a',      // Over budget
  },
  
  // UI colors
  background: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    tertiary: '#e9ecef',
  },
  
  text: {
    primary: '#212529',
    secondary: '#495057',
    tertiary: '#868e96',
    disabled: '#adb5bd',
  },
};
