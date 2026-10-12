/* IPS-54654 - DB checks (TC_033 - TC_038). Run on STAGING only. Record results in the Excel report manually. */

-- TC_033: boundary values -> expect 0.00 | 999.00 | 1,000.00 | 99,999.00 | 1,00,000.00 | 12,34,567.50 | 12,34,56,789.00
SELECT v.Input, MM.fn_FormatIndianAmount(v.Input) AS Formatted
FROM (VALUES (0),(999),(1000),(99999),(100000),(1234567.5),(123456789)) AS v(Input);

-- TC_034: NULL -> expect NULL / blank, no error
SELECT MM.fn_FormatIndianAmount(NULL) AS NullResult;

-- TC_035: more than 2 decimals -> expect 1,234.57 (confirm rounding with dev)
SELECT MM.fn_FormatIndianAmount(1234.567) AS ThreeDecimals;

-- TC_036: valid PPRF Id -> amount columns in Indian format
-- Replace <PPRFId> with the Id of the draft saved by TC_025
EXEC NPPRF_GetPPRFDetailsFromPPRFId @PPRFId = <PPRFId>;

-- TC_037: invalid PPRF Id -> empty result, no error
EXEC NPPRF_GetPPRFDetailsFromPPRFId @PPRFId = 999999;

-- TC_038: stored amounts must be plain numbers (no commas). Adjust table/column names to your schema.
-- SELECT PPRFId, UnitPrice, TotalCost, GrandTotal FROM <PPRF item table> WHERE PPRFId = <PPRFId>;
