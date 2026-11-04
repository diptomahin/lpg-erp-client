import apiClient, { unwrap } from "./apiClient";

const list = (path, params) => apiClient.get(path, { params }).then(unwrap);
const detail = (path) => apiClient.get(path).then(unwrap);
const listAll = async (path, params = {}) => {
  const limit = 100;
  const firstPage = await list(path, { ...params, page: 1, limit });
  const totalPages = Number(firstPage?.pagination?.totalPages || 1);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      list(path, { ...params, page: index + 2, limit }),
    ),
  );
  return [
    ...(Array.isArray(firstPage?.rows) ? firstPage.rows : []),
    ...remainingPages.flatMap((page) =>
      Array.isArray(page?.rows) ? page.rows : [],
    ),
  ];
};

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
  listAll: () => listAll("/customers"),
  get: (id) => detail(`/customers/${id}`),
  overview: (id) => detail(`/customers/${id}/overview`),
  advanceDetails: (id) => detail(`/customers/${id}/advances`),
  refundAdvance: (id, payload) =>
    apiClient.post(`/customers/${id}/advance-refunds`, payload).then(unwrap),
  dues: () => detail("/dues"),
  advances: () => detail("/advances"),
  create: (payload) => apiClient.post("/customers", payload).then(unwrap),
  update: (id, payload) =>
    apiClient.put(`/customers/${id}`, payload).then(unwrap),
  remove: (id) => apiClient.delete(`/customers/${id}`).then(unwrap),
};
export const supplierService = {
  list: (params) => list("/suppliers", params),
  listAll: () => listAll("/suppliers"),
  get: (id) => detail(`/suppliers/${id}`),
  overview: (id) => detail(`/suppliers/${id}/overview`),
  advances: () => detail("/supplier-advances"),
  create: (payload) => apiClient.post("/suppliers", payload).then(unwrap),
  update: (id, payload) =>
    apiClient.put(`/suppliers/${id}`, payload).then(unwrap),
  remove: (id) => apiClient.delete(`/suppliers/${id}`).then(unwrap),
};
export const cylinderService = {
  list: (params) => list("/cylinder-types", params),
  create: (payload) => apiClient.post("/cylinder-types", payload).then(unwrap),
  update: (id, payload) =>
    apiClient.put(`/cylinder-types/${id}`, payload).then(unwrap),
};
export const saleService = {
  list: (params) => list("/sales", params),
  get: (id) => detail(`/sales/${id}`),
  create: (payload) => apiClient.post("/sales", payload).then(unwrap),
};
export const purchaseService = {
  list: (params) => list("/purchases", params),
  get: (id) => detail(`/purchases/${id}`),
  create: (payload) => apiClient.post("/purchases", payload).then(unwrap),
  confirmQuantity: (id, payload) =>
    apiClient.patch(`/purchases/${id}/quantity`, payload).then(unwrap),
};
export const inventoryService = {
  get: (params) => list("/inventory", params),
  getBatch: (id) => detail(`/purchase-batches/${id}`),
};
export const reportService = {
  daily: (params) => list("/reports/daily", params),
  monthly: (params) => list("/reports/monthly", params),
  sales: (params) => list("/reports/sales", params),
  salesAll: (params) => listAll("/reports/sales", params),
  purchases: (params) => list("/reports/purchases", params),
  purchasesAll: (params) => listAll("/reports/purchases", params),
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
  listAll: (params) => listAll("/expenses", params),
  create: (payload) => apiClient.post("/expenses", payload).then(unwrap),
};
export const salaryService = {
  people: (params) => list("/people", params),
  peopleAll: () => listAll("/people"),
  createPerson: (payload) => apiClient.post("/people", payload).then(unwrap),
  updatePerson: (id, payload) =>
    apiClient.put(`/people/${id}`, payload).then(unwrap),
  salaries: (params) => list("/salary-payments", params),
  salariesAll: () => listAll("/salary-payments"),
  createSalary: (payload) =>
    apiClient.post("/salary-payments", payload).then(unwrap),
  profitShares: (params) => list("/profit-shares", params),
  profitSharesAll: () => listAll("/profit-shares"),
  createProfitShare: (payload) =>
    apiClient.post("/profit-shares", payload).then(unwrap),
};
export const expenseCategoryService = {
  list: (params) => list("/expense-categories", params),
};
