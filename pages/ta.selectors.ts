/**
 * ALL Travelling Allowance Claim locators live here.
 * Taken from the live staging form (IITGNforms/hr/travelallowance). The form is Vueform:
 * every field has a stable id like "Section.List.<row>.Field", so locators use [id="..."].
 * If the UI changes, edit ONLY this file.
 */
const id = (s: string) => `[id="${s}"]`;

export const TA_SEL = {
  // Navigation: top menu "General" -> Individual (radio) -> Claims -> Travelling Allowance
  nav: {
    generalMenu: 'button.nav-tab:has-text("General")',
    individual: 'text="Individual" >> visible=true',
    taLink: '.mega-link:has-text("Travelling Allowance") >> visible=true',
  },

  pageHeading: 'text=Travelling Allowance Claim >> visible=true',

  /** "The request is for:" tabs - use with { hasText: 'Self' | 'Guest' } */
  requestFor: 'label[role="radio"]',

  // Employee details (Self) - read-only, auto-filled
  empId: id('EmployeeDetails.empid'),
  empName: id('EmployeeDetails.EmpName'),
  department: id('EmployeeDetails.Department'),
  designation: id('EmployeeDetails.Designation'),
  payLevel: id('EmployeeDetails.Paylevel'),

  // Guest details
  guestName: id('EmployeeDetailsGuest.EmpName'),
  guestOrganization: id('EmployeeDetailsGuest.Organization'),
  guestPurpose: id('TravelDetailsGuest.PurposeOfTravel'),
  guestTotalFund: id('container.column1.totalFundRequired'),
  guestFundSource: 'container.column2.SourceOfFunds.0.Fund_Source',          // combobox id
  guestFundAmount: id('container.column2.SourceOfFunds.0.TotalExpenses'),

  // Saved claim + travel details (comboboxes: pass the bare id to TAPage.choose)
  savedTA: 'SavedDetails.SaveTA',
  eOfficeReceipt: 'TravelDetails.eOfficeReceiptNo',
  purposeOfTravel: id('TravelDetails.PurposeOfLeave'),
  fundTotalAmount: id('TravelDetails.FundsDetails.FundTotalAmount'),

  // Particulars of Journey - row i
  journey: {
    departurePlace: (i: number) => id(`JourneyDetails.JourneyList.${i}.DeparturePlace`),
    departureDate: (i: number) => id(`JourneyDetails.JourneyList.${i}.DepartureDate`),
    arrivalPlace: (i: number) => id(`JourneyDetails.JourneyList.${i}.ArrivalPlace`),
    arrivalDate: (i: number) => id(`JourneyDetails.JourneyList.${i}.ArrivalDate`),
    mode: (i: number) => `JourneyDetails.JourneyList.${i}.ModeOfTravel`,   // combobox id
    km: (i: number) => id(`JourneyDetails.JourneyList.${i}.KM`),
    amount: (i: number) => id(`JourneyDetails.JourneyList.${i}.Amount`),
  },
  journeyRows: '[id^="JourneyDetails.JourneyList."][id$=".DeparturePlace"]',
  journeyRemove: '[aria-labelledby="JourneyDetails.JourneyList__label"] [aria-roledescription="Remove item button"]',

  accommodationAmount: (i: number) => id(`ExpenseDetails.Accomodation.AccomodationList.${i}.Amount`),

  perDiem: {
    from: (i: number) => id(`PerDiemCharges.PerDiemList.${i}.PerDiemFromDate`),
    to: (i: number) => id(`PerDiemCharges.PerDiemList.${i}.PerDiemToDate`),
    amountPerDay: (i: number) => id(`PerDiemCharges.PerDiemList.${i}.PerDiemAmount`),
    total: (i: number) => id(`PerDiemCharges.PerDiemList.${i}.PerDiemTotal`),
  },

  otherExpensesAmount: (i: number) => id(`OtherExpenses.OtherExpensesList.${i}.OtherExpensesAmount`),

  grossAmount: id('ClaimSummary.GrossAmount'),
  advanceReceived: id('ClaimSummary.AdvanceReceived'),
  netAmount: id('ClaimSummary.NetAmount'),

  paymentName: (i: number) => id(`PaymentDetails.PaymentList.${i}.PaymentName`),
  paymentAmount: (i: number) => id(`PaymentDetails.PaymentList.${i}.Amount`),

  declaration: id('h3.checkbox'),
  remarks: id('h3.Remarks'),

  save: id('savesubmitpreview.column4_6.save'),
  preview: id('savesubmitpreview.column4_6.Preview'),
  submit: id('savesubmitpreview.column4_6.submit'),

  /** Inline Vueform error under a field: fieldError('h3.checkbox') */
  fieldError: (fieldId: string) => id(`${fieldId}__error`),
  /** SweetAlert popup */
  alertTitle: '.swal2-title',
  alertText: '.swal2-html-container',
  alertOk: '.swal2-confirm',
  successMessage: '.swal2-success, .toast-success, .alert-success',
};
