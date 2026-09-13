import apiClient, { unwrap } from "./apiClient";

const list = (path, params) => apiClient.get(path, { params }).then(unwrap);
const detail = (path) => apiClient.get(path).then(unwrap);

export const authService = {
  login: (payload) => apiClient.post("/auth/login", payload).then(unwrap),
  me: () => detail("/auth/me"),
  changePassword: (payload) =>
    apiClient.put("/auth/password", payload).then(unwrap),
};
export const dashboardService = {
  summary: () => detail("/dashboard/summary"),
  recentSales: () => list("/dashboard/recent-sales"),
  recentPurchases: () => list("/dashboard/recent-purchases"),
  recentPayments: () => list("/dashboard/recent-payments"),
};
export const customerService = {
  list: (params) => list("/customers", params),
  get: (id) => detail(`/customers/${id}`),
  create: (payload) => apiClient.post("/customers", payload).then(unwrap),
  update: (id, payload) =>
    apiClient.put(`/customers/${id}`, payload).then(unwrap),
};
export const supplierService = {
  list: (params) => list("/suppliers", params),
  get: (id) => detail(`/suppliers/${id}`),
  create: (payload) => apiClient.post("/suppliers", payload).then(unwrap),
  update: (id, payload) =>
    apiClient.put(`/suppliers/${id}`, payload).then(unwrap),
};
export const cylinderService = { list: () => list("/cylinder-types") };
export const saleService = {
  list: (params) => list("/sales", params),
  get: (id) => detail(`/sales/${id}`),
  create: (payload) => apiClient.post("/sales", payload).then(unwrap),
};
export const purchaseService = {
  list: (params) => list("/purchases", params),
  create: (payload) => apiClient.post("/purchases", payload).then(unwrap),
};
export const inventoryService = {
  get: (params) => list("/inventory", params),
  getBatch: (id) => detail(`/purchase-batches/${id}`),
};
export const reportService = {
  daily: (params) => list("/reports/daily", params),
  monthly: (params) => list("/reports/monthly", params),
  sales: (params) => list("/reports/sales", params),
  purchases: (params) => list("/reports/purchases", params),
  inventory: (params) => list("/reports/inventory", params),
  profit: (params) => list("/reports/profit", params),
  batchProfit: (params) => list("/reports/batch-profit", params),
  customerDues: (params) => list("/reports/customer-dues", params),
  supplierPayables: (params) => list("/reports/supplier-payables", params),
  expenses: (params) => list("/reports/expenses", params),
};
export const settingsService = {
  authorizeTheoreticalProfit: (payload) =>
    apiClient.post("/settings/theoretical-profit", payload).then(unwrap),
};
export const paymentService = {
  customerList: (params) => list("/customer-payments", params),
  customerCreate: (payload) =>
    apiClient.post("/customer-payments", payload).then(unwrap),
  supplierList: (params) => list("/supplier-payments", params),
  supplierCreate: (payload) =>
    apiClient.post("/supplier-payments", payload).then(unwrap),
};
export const expenseService = {
  list: (params) => list("/expenses", params),
  create: (payload) => apiClient.post("/expenses", payload).then(unwrap),
};
export const salaryService = {
  people: (params) => list("/people", params),
  createPerson: (payload) => apiClient.post("/people", payload).then(unwrap),
  updatePerson: (id, payload) =>
    apiClient.put(`/people/${id}`, payload).then(unwrap),
  salaries: (params) => list("/salary-payments", params),
  createSalary: (payload) =>
    apiClient.post("/salary-payments", payload).then(unwrap),
  profitShares: (params) => list("/profit-shares", params),
  createProfitShare: (payload) =>
    apiClient.post("/profit-shares", payload).then(unwrap),
};
export const expenseCategoryService = {
  list: (params) => list("/expense-categories", params),
};
