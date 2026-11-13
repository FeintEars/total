import { elementText, parseFlexStatements } from './flex-xml.js';

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
</OpenPositions>
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

describe('elementText', () => {
  it('reads the Flex response envelope', () => {
    const response =
      '<FlexStatementResponse timestamp="x"><Status>Warn</Status><ErrorCode>1019</ErrorCode><ErrorMessage>Statement generation in progress.</ErrorMessage></FlexStatementResponse>';
    expect(elementText(response, 'Status')).toBe('Warn');
    expect(elementText(response, 'ErrorCode')).toBe('1019');
  });
});
