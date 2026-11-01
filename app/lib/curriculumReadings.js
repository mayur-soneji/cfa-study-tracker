export const curriculumReadings = {
  quantitativeMethods: [
    'Returns of Financial Assets and Instruments',
    'Types of Financial Returns',
    'Benchmarking Returns',
    'The Time Value of Money in Finance',
    'Statistical Characteristics of Asset Returns',
    'Statistical Distributions for Financial Asset Prices and Returns',
    'Estimation and Hypothesis Testing',
    'The Return and Risk of a Financial Portfolio',
    'Simulation of Financial Asset Prices and Returns',
    'Applications of Simple Linear Regression in Finance',
    'Introduction to Financial Data Science',
  ],
  economics: [
    'The Firm & Market Structures',
    'Understanding Business Cycles',
    'Fiscal Policy',
    'Monetary Policy',
    'Introduction to Geopolitics',
    'International Trade',
    'Capital Flows and the FX Market',
    'Exchange Rate Calculations',
  ],
  corporateFinance: [
    'Organizational Forms, Corporate Issuer Features, and Ownership',
    'Investors and Other Stakeholders',
    'Corporate Governance: Conflicts, Mechanisms, Risks, and Benefits',
    'Working Capital and Liquidity',
    'Capital Investments and Capital Allocation',
    'Capital Structure',
    'Business Models',
  ],
  financialStatementAnalysis: [
    'Introduction to Financial Statement Analysis',
    'Analyzing Income Statements',
    'Analyzing Balance Sheets',
    'Analyzing Statements of Cash Flows I',
    'Analyzing Statements of Cash Flows II',
    'Analysis of Inventories',
    'Analysis of Long-Term Assets',
    'Topics in Long-Term Liabilities and Equity',
    'Analysis of Income Taxes',
    'Financial Reporting Quality',
    'Financial Analysis Techniques',
    'Introduction to Financial Statement Modeling',
  ],
  equities: [
    'Equity Instrument Features',
    'Equity Jurisdictions, Classes, and the Voting Process',
    'Equity Issuance and Trading',
    'Sources of Equity Returns',
    'Introduction to Equity Valuation',
    'Discounted Cash Flow and Growth Models',
    'Relative Value Equity Valuation Approaches',
    'Financial Statement Forecasting in Equity Valuation',
    'Industry and Competitive Analysis',
    'Company Analysis: Past, Present, and Future',
    'Equity Analyst Research Reports',
    'The Capital Asset Pricing Model, Market Model, and Other Factor-Based Equity Models',
  ],
  fixedIncome: [
    'Fixed-Income Instrument Features',
    'Fixed-Income Cash Flows and Types',
    'Fixed-Income Issuance and Trading',
    'Fixed-Income Markets for Corporate Issuers',
    'Fixed-Income Markets for Government Issuers',
    'Fixed-Income Bond Valuation: Prices and Yields',
    'Yield and Yield Spread Measures for Fixed-Rate Bonds',
    'Yield and Yield Spread Measures for Floating-Rate Instruments',
    'The Term Structure of Interest Rates: Spot, Par, and Forward Curves',
    'Interest Rate Risk and Return',
    'Yield-Based Bond Duration Measures and Properties',
    'Yield-Based Bond Convexity and Portfolio Properties',
    'Curve-Based and Empirical Fixed-Income Risk Measures',
    'Credit Risk',
    'Credit Analysis for Government Issuers',
    'Credit Analysis for Corporate Issuers',
    'Fixed-Income Securitization',
    'Asset-Backed Security (ABS) Instrument and Market Features',
    'Mortgage-Backed Security (MBS) Instrument and Market Features',
  ],
  derivativesAndRiskManagement: [
    'Derivative Instrument and Derivative Market Features',
    'Forward Commitment and Contingent Claim Features and Instruments',
    'Derivative Benefits, Risks, and Issuer and Investor Uses',
    'Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives',
    'Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities',
    'Pricing and Valuation of Futures Contracts',
    'Pricing and Valuation of Interest Rate and Other Swaps',
    'Pricing and Valuation of Options',
    'Option Replication Using Put-Call Parity',
    'Valuing a Derivative Using a One-Period Binomial Model',
  ],
  alternativeInvestments: [
    'Alternative Investment Features, Methods, and Structures',
    'Alternative Investment Performance and Returns',
    'Investments in Private Capital: Equity and Debt',
    'Real Estate and Infrastructure',
    'Natural Resources',
    'Hedge Funds',
    'Introduction to Digital Assets',
  ],
  portfolioConstruction: [
    'Portfolio Risk & Return: Part I',
    'Portfolio Risk & Return: Part II',
    'Portfolio Management: An Overview',
    'Basics of Portfolio Planning & Construction',
    'The Behavioral Biases of Individuals',
    'Introduction to Risk Management',
  ],
  ethics: [
    'Ethics and Trust in the Investment Profession',
    'Code of Ethics and Standards of Professional Conduct',
    'Guidance for Standard I: Professionalism',
    'Guidance for Standard II: Integrity of Capital Markets',
    'Guidance for Standard III: Duties to Clients',
    'Guidance for Standard IV: Duties to Employers',
    'Guidance for Standard V: Investment Analysis, Recommendations, and Actions',
    'Guidance for Standard VI: Conflicts of Interest',
    'Guidance for Standard VII: Responsibilities as a CFA Institute Member or CFA Candidate',
    'Application of the Code and Standards: Level I',
  ],
};

export const readingRanges = {
  quantitativeMethods: [1, 11],
  economics: [12, 19],
  corporateFinance: [20, 26],
  financialStatementAnalysis: [27, 38],
  equities: [39, 50],
  fixedIncome: [51, 69],
  derivativesAndRiskManagement: [70, 79],
  alternativeInvestments: [80, 86],
  portfolioConstruction: [87, 92],
  ethics: [93, 102],
};

export const totalLearningModules = Object.values(curriculumReadings).reduce((sum, readings) => sum + readings.length, 0);


// 2027 multi-level curriculum metadata. The existing Level I reading list remains
// the canonical Level I source, preserving its established reading identifiers.
export const LEVEL_1_TOPICS = [
  ['quantitativeMethods', 'Quantitative Methods', 'Sep 1–21', 32, 7.5],
  ['economics', 'Economics', 'Jan 13–Feb 2', 32, 7.5],
  ['corporateFinance', 'Corporate Issuers', 'Nov 25–Dec 15', 26, 7.5],
  ['financialStatementAnalysis', 'Financial Statement Analysis', 'Sep 22–Oct 27', 52, 12.5],
  ['equities', 'Equity Investments', 'Dec 16–Jan 12', 44, 12.5],
  ['fixedIncome', 'Fixed Income', 'Oct 28–Nov 24', 46, 12.5],
  ['derivativesAndRiskManagement', 'Derivatives', 'Feb 24–Mar 9', 26, 6.5],
  ['alternativeInvestments', 'Alternative Investments', 'Mar 10–23', 22, 8.5],
  ['portfolioConstruction', 'Portfolio Management', 'Feb 3–23', 32, 8],
  ['ethics', 'Ethical and Professional Standards', 'Mar 24–Apr 7', 48, 17],
];

export const LEVEL_2_TOPICS = [
  ['quantitativeMethods', 'Quantitative Methods', 'Block 1', 30, 7.5],
  ['economics', 'Economics', 'Block 2', 24, 7.5],
  ['corporateFinance', 'Corporate Issuers', 'Block 3', 24, 7.5],
  ['financialStatementAnalysis', 'Financial Statement Analysis', 'Block 4', 48, 12.5],
  ['equities', 'Equity Valuation', 'Block 5', 52, 12.5],
  ['fixedIncome', 'Fixed Income', 'Block 6', 44, 12.5],
  ['derivativesAndRiskManagement', 'Derivatives', 'Block 7', 28, 7.5],
  ['alternativeInvestments', 'Alternative Investments', 'Block 8', 26, 7.5],
  ['portfolioConstruction', 'Portfolio Management', 'Block 9', 36, 12.5],
  ['ethics', 'Ethical and Professional Standards', 'Block 10', 36, 12.5],
];

export const LEVEL_2_READINGS = {
  quantitativeMethods: ['Basics of Multiple Regression and Underlying Assumptions', 'Evaluating Regression Model Fit and Interpreting Model Results', 'Model Misspecification', 'Extensions of Multiple Regression', 'Time-Series Analysis', 'Machine Learning', 'Big Data Projects'],
  economics: ['Currency Exchange Rates: Understanding Equilibrium Value', 'Economic Growth', 'Economics of Regulation'],
  corporateFinance: ['Analysis of Dividends and Share Repurchases', 'Environmental, Social, and Governance (ESG) Considerations in Investment Analysis', 'Cost of Capital: Advanced Topics', 'Corporate Restructuring'],
  financialStatementAnalysis: ['Intercorporate Investments', 'Employee Compensation: Post-Employment and Share-Based', 'Multinational Operations', 'Analysis of Financial Institutions', 'Evaluating Quality of Financial Reports', 'Integration of Financial Statement Analysis Techniques', 'Financial Statement Modeling'],
  equities: ['Equity Valuation: Applications and Processes', 'Discounted Dividend Valuation', 'Free Cash Flow Valuation', 'Market-Based Valuation: Price and Enterprise Value Multiples', 'Residual Income Valuation', 'Private Company Valuation'],
  fixedIncome: ['The Term Structure and Interest Rate Dynamics', 'The Arbitrage-Free Valuation Framework', 'Valuation and Analysis of Bonds with Embedded Options', 'Credit Analysis Models', 'Credit Default Swaps'],
  derivativesAndRiskManagement: ['Pricing and Valuation of Forward Commitments', 'Valuation of Contingent Claims'],
  alternativeInvestments: ['Introduction to Commodities and Commodity Derivatives', 'Overview of Types of Real Estate Investment', 'Investments in Real Estate Through Publicly Traded Securities', 'Hedge Fund Strategies'],
  portfolioConstruction: ['Exchange-Traded Funds: Mechanics and Applications', 'Using Multifactor Models', 'Measuring and Managing Market Risk', 'Backtesting and Simulation', 'Economics and Investment Markets', 'Analysis of Active Portfolio Management', 'Trading Cost and Electronic Markets'],
  ethics: ['Code of Ethics and Standards of Professional Conduct', 'Guidance for Standards I–VII', 'Application of the Code and Standards: Level II'],
};

export const LEVEL_3_CORE_TOPICS = [
  ['assetAllocation', 'Asset Allocation', 'Core Block 1', 42, 17.5],
  ['portfolioConstruction', 'Portfolio Construction', 'Core Block 2', 42, 17.5],
  ['performanceMeasurement', 'Performance Measurement', 'Core Block 3', 24, 7.5],
  ['derivativesAndRiskManagement', 'Derivatives and Risk Management', 'Core Block 4', 30, 10],
  ['ethics', 'Ethical and Professional Standards', 'Core Block 5', 32, 12.5],
];
export const LEVEL_3_PATHWAY_META = {
  portfolioManagement: { id: 'portfolioManagement', name: 'Portfolio Management Pathway', topicTuple: ['pathway_portfolioManagement', 'Pathway: Portfolio Management', 'Pathway Block', 90, 35] },
  privateMarkets: { id: 'privateMarkets', name: 'Private Markets Pathway', topicTuple: ['pathway_privateMarkets', 'Pathway: Private Markets', 'Pathway Block', 90, 35] },
  privateWealth: { id: 'privateWealth', name: 'Private Wealth Pathway', topicTuple: ['pathway_privateWealth', 'Pathway: Private Wealth', 'Pathway Block', 90, 35] },
};
export const LEVEL_3_CORE_READINGS = {
  assetAllocation: ['Capital Market Expectations, Part 1: Framework and Macro Considerations', 'Capital Market Expectations, Part 2: Forecasting Asset Class Returns', 'Overview of Asset Allocation', 'Principles of Asset Allocation', 'Asset Allocation with Real-World Constraints'],
  portfolioConstruction: ['Overview of Equity Portfolio Management', 'Overview of Fixed-Income Portfolio Management', 'Asset Allocation to Alternative Investments', 'An Overview of Private Wealth Management', 'Portfolio Management for Institutional Investors'],
  performanceMeasurement: ['Portfolio Performance Evaluation', 'Investment Manager Selection', 'Overview of the Global Investment Performance Standards (GIPS)'],
  derivativesAndRiskManagement: ['Options Strategies', 'Swaps, Forwards, and Futures Strategies', 'Currency Management: An Introduction'],
  ethics: ['Code of Ethics and Standards of Professional Conduct', 'Guidance for Standards I–VII', 'Application of the Code and Standards: Level III', 'Asset Manager Code of Professional Conduct'],
};
export const LEVEL_3_PATHWAY_READINGS = {
  pathway_portfolioManagement: ['Index-Based Equity Strategies', 'Active Equity Investing: Strategies', 'Active Equity Investing: Portfolio Construction', 'Liability-Driven and Index-Based Strategies', 'Yield Curve Strategies', 'Fixed-Income Active Management: Credit Strategies', 'Trade Strategy and Execution', 'Case Study in Portfolio Management: Institutional'],
  pathway_privateMarkets: ['Private Investments and Structures', 'General Partner and Investor Perspectives and the Investment Process', 'Private Equity', 'Private Debt', 'Private Special Situations', 'Private Real Estate Investments', 'Infrastructure'],
  pathway_privateWealth: ['The Private Wealth Management Industry', 'Working with the Wealthy', 'Wealth Planning', 'Investment Planning', 'Preserving the Wealth', 'Advising the Wealthy', 'Transferring the Wealth'],
};

export function getActiveCurriculum(level = 'l1', pathway = 'portfolioManagement') {
  if (level === 'l2') return createCurriculum(LEVEL_2_TOPICS, LEVEL_2_READINGS);
  if (level === 'l3') {
    const selectedPathway = LEVEL_3_PATHWAY_META[pathway] ? pathway : 'portfolioManagement';
    return createCurriculum(
      [...LEVEL_3_CORE_TOPICS, LEVEL_3_PATHWAY_META[selectedPathway].topicTuple],
      { ...LEVEL_3_CORE_READINGS, [LEVEL_3_PATHWAY_META[selectedPathway].topicTuple[0]]: LEVEL_3_PATHWAY_READINGS[LEVEL_3_PATHWAY_META[selectedPathway].topicTuple[0]] },
    );
  }
  return createCurriculum(LEVEL_1_TOPICS, curriculumReadings);
}
export function createCurriculum(topics, readings) {
  let nextReading = 1;
  const ranges = {};
  topics.forEach(([id]) => { const count = (readings[id] || []).length; ranges[id] = [nextReading, nextReading + Math.max(0, count - 1)]; nextReading += count; });
  return { topics, readings, readingRanges: ranges, totalLearningModules: nextReading - 1 };
}
