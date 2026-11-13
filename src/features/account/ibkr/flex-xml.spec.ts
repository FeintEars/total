import {
  elementText,
  parseFlexPositions,
  parseFlexStatements,
} from './flex-xml.js';

const REPORT = `<?xml version="1.0" encoding="UTF-8"?>
<FlexQueryResponse queryName="mr-total-bot" type="AF">
<FlexStatements count="1">
<FlexStatement accountId="U123" fromDate="20261112" toDate="20261112" period="LastBusinessDay">
<EquitySummaryInBase>
<EquitySummaryByReportDateInBase accountId="U123" currency="EUR" reportDate="20261111" cash="10" total="1000" />
<EquitySummaryByReportDateInBase accountId="U123" acctAlias="Main" currency="EUR" reportDate="20261112" cash="10" total="1234.5" />
</EquitySummaryInBase>
<CashReport>
<CashReportCurrency accountId="U123" currency="BASE_SUMMARY" endingCash="10" />
<CashReportCurrency accountId="U123" currency="USD" endingCash="11" />
<CashReportCurrency accountId="U123" currency="EUR" endingCash="300" />
</CashReport>
<OpenPositions>
<OpenPosition accountId="U123" currency="USD" fxRateToBase="0.9" symbol="AAPL" description="APPLE INC" position="5" positionValue="1000" levelOfDetail="SUMMARY" />
<OpenPosition accountId="U123" currency="USD" fxRateToBase="0.9" symbol="AAPL" description="APPLE INC" position="5" positionValue="1000" levelOfDetail="LOT" />
<OpenPosition accountId="U123" currency="EUR" fxRateToBase="1" symbol="S&amp;P" position="2" positionValue="200" levelOfDetail="SUMMARY" />
</OpenPositions>
</FlexStatement>
<FlexStatement accountId="U456">
<EquitySummaryInBase>
<EquitySummaryByReportDateInBase accountId="U456" currency="PLN" reportDate="20261112" total="400" />
<EquitySummaryByReportDateInBase accountId="U456" currency="PLN" reportDate="20261111" total="1" />
</EquitySummaryInBase>
<OpenPositions>
<OpenPosition accountId="U456" currency="PLN" fxRateToBase="1" symbol="CDR" position="1" positionValue="400" levelOfDetail="SUMMARY" />
<OpenPosition accountId="U456" currency="USD" fxRateToBase="4" symbol="AAPL" position="1" positionValue="200" levelOfDetail="SUMMARY" />
<OpenPosition accountId="U456" currency="USD" fxRateToBase="4" symbol="MSFT" position="0" positionValue="0" levelOfDetail="SUMMARY" />
</OpenPositions>
<CashReport>
<CashReportCurrency accountId="U456" currency="PLN" endingCash="0.002140001" />
<CashReportCurrency accountId="U456" currency="CAD" endingCash="-0.004" />
<CashReportCurrency accountId="U456" currency="USD" endingCash="-0.004" />
</CashReport>
<ConversionRates>
<ConversionRate reportDate="20261111" fromCurrency="EUR" toCurrency="USD" rate="1.2" />
<ConversionRate reportDate="20261112" fromCurrency="EUR" toCurrency="USD" rate="1.1" />
<ConversionRate reportDate="20261112" fromCurrency="USD" toCurrency="PLN" rate="4" />
</ConversionRates>
</FlexStatement>
</FlexStatements>
</FlexQueryResponse>`;

describe('parseFlexStatements', () => {
  it('lists sub-accounts in their own currency and totals them in USD', () => {
    const snapshot = parseFlexStatements(REPORT);
    expect(snapshot.asOf).toBe('2026-11-12');
    expect(snapshot.usdAmount).toBeCloseTo(1234.5 * 1.1 + 400 / 4);
    expect(snapshot.positions).toEqual([
      { name: 'Main', amount: 1234.5, currency: 'EUR' },
      { name: 'U456', amount: 400, currency: 'PLN' },
    ]);
  });

  it('asks for conversion rates when a base currency has none', () => {
    expect(() =>
      parseFlexStatements(
        '<FlexStatement accountId="U1"><EquitySummaryByReportDateInBase currency="CHF" total="1" /></FlexStatement>',
      ),
    ).toThrow(/Conversion Rates/);
  });

  it('asks for the NAV section when it is missing', () => {
    expect(() =>
      parseFlexStatements(
        '<FlexQueryResponse><FlexStatement accountId="U1"></FlexStatement></FlexQueryResponse>',
      ),
    ).toThrow(/Net Asset Value/);
  });
});

describe('parseFlexPositions', () => {
  it('lists sub-accounts with their positions, then non-zero cash, totalled by NAV', () => {
    const snapshot = parseFlexPositions(REPORT);
    expect(snapshot.asOf).toBe('2026-11-12');
    expect(snapshot.usdAmount).toBeCloseTo(1234.5 * 1.1 + 400 / 4);
    expect(snapshot.positions).toEqual([
      {
        name: 'Main',
        amount: 1234.5,
        currency: 'EUR',
        subpositions: [
          { name: 'AAPL', quantity: 5, amount: 1000, currency: 'USD' },
          { name: 'S&P', quantity: 2, amount: 200, currency: 'EUR' },
          { name: 'Cash', amount: 300, currency: 'EUR' },
          { name: 'Cash', amount: 11, currency: 'USD' },
        ],
      },
      {
        name: 'U456',
        amount: 400,
        currency: 'PLN',
        subpositions: [
          { name: 'AAPL', quantity: 1, amount: 200, currency: 'USD' },
          { name: 'CDR', quantity: 1, amount: 400, currency: 'PLN' },
        ],
      },
    ]);
  });

  it('takes cash from the base summary when there is no currency breakdown', () => {
    const snapshot = parseFlexPositions(
      '<FlexStatement accountId="U1"><EquitySummaryByReportDateInBase currency="PLN" total="960" /><OpenPositions><OpenPosition currency="PLN" symbol="TEN" position="2" positionValue="179.3" levelOfDetail="SUMMARY" /></OpenPositions><CashReport><CashReportCurrency currency="BASE_SUMMARY" levelOfDetail="BaseCurrency" endingCash="315.327684" /></CashReport><ConversionRate fromCurrency="USD" toCurrency="PLN" rate="4" /></FlexStatement>',
    );
    expect(snapshot.positions[0].subpositions).toEqual([
      { name: 'TEN', quantity: 2, amount: 179.3, currency: 'PLN' },
      { name: 'Cash', amount: 315.327684, currency: 'PLN' },
    ]);
  });

  it('asks for the Open Positions section when it is missing', () => {
    expect(() =>
      parseFlexPositions(
        '<FlexStatement accountId="U1"><EquitySummaryByReportDateInBase currency="USD" total="1" /><CashReport /></FlexStatement>',
      ),
    ).toThrow(/Open Positions/);
  });

  it('asks for the Cash Report section when it is missing', () => {
    expect(() =>
      parseFlexPositions(
        '<FlexStatement accountId="U1"><EquitySummaryByReportDateInBase currency="USD" total="1" /><OpenPositions /></FlexStatement>',
      ),
    ).toThrow(/Cash Report/);
  });
});

describe('usd conversion', () => {
  it('crosses rates through a shared currency', () => {
    const snapshot = parseFlexStatements(
      '<FlexStatement accountId="U1"><EquitySummaryByReportDateInBase currency="EUR" total="100" /><ConversionRate fromCurrency="EUR" toCurrency="PLN" rate="4.3" /><ConversionRate fromCurrency="USD" toCurrency="PLN" rate="4" /></FlexStatement>',
    );
    expect(snapshot.usdAmount).toBeCloseTo(107.5);
  });
});

describe('report date', () => {
  it('falls back to today when the report has no toDate', () => {
    const snapshot = parseFlexStatements(
      '<FlexStatement accountId="U1"><EquitySummaryByReportDateInBase currency="USD" total="1" /></FlexStatement>',
    );
    expect(snapshot.asOf).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('elementText', () => {
  it('reads the Flex response envelope', () => {
    const response =
      '<FlexStatementResponse timestamp="x"><Status>Warn</Status><ErrorCode>1019</ErrorCode><ErrorMessage>Statement generation in progress.</ErrorMessage></FlexStatementResponse>';
    expect(elementText(response, 'Status')).toBe('Warn');
    expect(elementText(response, 'ErrorCode')).toBe('1019');
  });
});
