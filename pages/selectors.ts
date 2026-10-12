/**
 * ALL UI locators live here.
 * The PPRF page HTML was not available when this suite was written, so these are
 * based on the labels / placeholders visible in the screenshots. Before the first run,
 * verify them with `npx playwright codegen <staging-url>` and change them ONLY here.
 */
export const SEL = {
  login: {
    username: 'input[name*="user" i], input[id*="user" i], input[type="email"]',
    password: 'input[type="password"]',
    submit: 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")',
  },

  // Logged-in marker: user chip at top right of IPAS
  loggedInUser: 'text=RD Jr. Assistant',

  // Navigation: top menu "MM" -> Process -> Individual -> STORES -> PPRF
  nav: {
    mmMenu: 'xpath=//*[self::a or self::button or self::span or self::li][normalize-space(text())="MM"]',
    individual: 'text=Individual',
    pprfLink: 'text="PPRF" >> visible=true',
  },

  pageHeading: 'text=Purchase Proposal Request Form >> visible=true',

  // Indenter details
  employeeId: 'xpath=(//*[normalize-space(text())="Employee ID"])[1]/following::input[1]',

  // Saved PPRF dropdown
  savedPprf: '[id="SavedDetails.SavedPPRF"]',

  // Item rows - use .nth(rowIndex), 0-based
  itemName: 'textarea[placeholder="Enter Item Name"]',
  itemDescription:
    'input[placeholder^="Enter Complete Description"], textarea[placeholder^="Enter Complete Description"]',
  quantity: 'input[placeholder="0"]',
  unitPrice: 'input[placeholder="Value"]',
  /** Relative to the Unit Price input of the same row */
  totalCostFromUnitPrice: 'xpath=following::input[1]',
  /** Relative to the Item Name textarea (Vueform comboboxes): 1 = Type of Material, 2 = GeM Availability, 3 = Mode of Purchase */
  rowSelect: (n: number) => `xpath=following::input[@role="combobox"][${n}]`,
  removeItem: '[aria-labelledby="DetailsofRequiredItems.list1__label"] .mask-form-remove-light',

  grandTotal: '[id="DetailsofRequiredItems2.GrandTotalbefore"]',
  roundedGrandTotal: '[id="DetailsofRequiredItems2.GrandTotal"]',

  purpose: '[id="DetailsofRequiredItems2.PurposeJustification"]',
  siteReadyYes: 'xpath=(//*[normalize-space(text())="Is site ready?"])[1]/following::input[@type="radio"][1]',

  totalFundAmount: 'input[placeholder="Enter Total Fund Amount"]',
  /** TODO: fill in after inspecting the row that appears on "Source of Funds -> + Add" (TC_023) */
  sourceOfFundsAmount: '',

  validationMessage:
    '.text-danger, .invalid-feedback, .field-validation-error, .error, .toast-message, .toast-error, .swal2-html-container, [role="alert"]',
  successMessage:
    '.toast-success, .alert-success, .swal2-success, .swal2-html-container, [role="alert"]',

  /** Options of the open Vueform dropdown */
  dropdownOption: '[role="option"] >> visible=true',
};
