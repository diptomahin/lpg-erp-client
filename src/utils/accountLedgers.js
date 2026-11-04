const roundBalance = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const timestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortEntries = (entries, recordedTimeFirst = false) =>
  entries.sort(
    (a, b) =>
      (recordedTimeFirst
        ? timestamp(a.createdAt || a.date) - timestamp(b.createdAt || b.date)
        : timestamp(a.date) - timestamp(b.date)) ||
      (recordedTimeFirst
        ? timestamp(a.date) - timestamp(b.date)
        : timestamp(a.createdAt || a.date) -
          timestamp(b.createdAt || b.date)) ||
      a.order - b.order,
  );

const withBalances = (entries, openingBalance, isSupplier) => {
  let balance = openingBalance;
  return entries.map((entry) => {
    balance = roundBalance(
      balance +
        (isSupplier
          ? Number(entry.payment || 0) - Number(entry.amount || 0)
          : Number(entry.amount || 0) - Number(entry.payment || 0)),
    );
    return { ...entry, balance };
  });
};

export const buildCustomerLedger = ({ customer, sales = [], payments = [] }) => {
  const entries = [
    ...sales.map((sale, order) => ({
      date: sale.saleDate,
      createdAt: sale.createdAt,
      description: "Sale",
      reference: sale.invoiceNumber || "-",
      amount: Number(sale.totalAmount || 0),
      payment: 0,
      order,
    })),
    ...payments
      .filter(
        (payment) =>
          payment.paymentType !== "advance_application",
      )
      .map((payment, index) => {
        const isRefund = payment.paymentType === "advance_refund";
        const isAdvance = payment.paymentType === "advance";
        const isRestoration = payment.paymentType === "advance_restoration";
        return {
          date: payment.paymentDate,
          createdAt: payment.createdAt,
          description: isRefund
            ? "Advance refund"
            : isRestoration
              ? "Advance restored"
              : isAdvance
                ? "Advance received"
                : "Customer payment",
          reference:
            payment.advanceRefundOf?.paymentNumber ||
            payment.paymentNumber ||
            payment.sale?.invoiceNumber ||
            "-",
          amount: isRefund ? Number(payment.amount || 0) : 0,
          payment: isRefund ? 0 : Number(payment.amount || 0),
          order: sales.length + index,
        };
      }),
  ];
  const sortedEntries = sortEntries(entries, true);
  const closingBalance = roundBalance(
    Number(customer?.totalDue || 0) - Number(customer?.advanceBalance || 0),
  );
  const activity = sortedEntries.reduce(
    (total, entry) => total + entry.amount - entry.payment,
    0,
  );
  const inferredOpeningBalance = closingBalance - activity;
  const storedOpeningBalance =
    customer?.migrationReceivable ?? customer?.openingBalance;
  const openingBalance = roundBalance(
    storedOpeningBalance !== undefined &&
      storedOpeningBalance !== null &&
      Number.isFinite(Number(storedOpeningBalance))
      ? Number(storedOpeningBalance)
      : inferredOpeningBalance,
  );

  return {
    openingBalance,
    closingBalance,
    entries: withBalances(sortedEntries, openingBalance, false),
  };
};

export const buildSupplierLedger = ({
  supplier,
  purchases = [],
  payments = [],
}) => {
  const entries = [
    ...purchases.map((purchase, order) => ({
      date: purchase.purchaseDate,
      createdAt: purchase.createdAt,
      description: "Purchase",
      reference: purchase.purchaseNumber || "-",
      amount: Number(purchase.totalCost || 0),
      payment: 0,
      order,
    })),
    ...payments
      .filter((payment) => payment.paymentType !== "advance_application")
      .map((payment, index) => {
        const isRefund = payment.paymentType === "advance_refund";
        const isRestoration = payment.paymentType === "advance_restoration";
        const isAdvance = payment.paymentType === "advance";
        return {
          date: payment.paymentDate,
          createdAt: payment.createdAt,
          description: isRefund
            ? "Advance refund received"
            : isRestoration
              ? "Advance restored"
              : isAdvance
                ? "Advance paid"
                : "Supplier payment",
          reference:
            payment.purchase?.purchaseNumber ||
            payment.advanceRefundOf?.paymentNumber ||
            payment.paymentNumber ||
            payment.reference ||
            "-",
          amount: isRefund ? Number(payment.amount || 0) : 0,
          payment: isRefund ? 0 : Number(payment.amount || 0),
          order: purchases.length + index,
        };
      }),
  ];
  const sortedEntries = sortEntries(entries, true);
  const closingBalance = roundBalance(
    Number(supplier?.advanceBalance || 0) - Number(supplier?.totalDue || 0),
  );
  const activity = sortedEntries.reduce(
    (total, entry) => total + entry.payment - entry.amount,
    0,
  );
  const inferredOpeningBalance = closingBalance - activity;
  const storedOpeningBalance =
    supplier?.migrationPayable ?? supplier?.openingBalance;
  const openingBalance = roundBalance(
    storedOpeningBalance !== undefined &&
      storedOpeningBalance !== null &&
      Number.isFinite(Number(storedOpeningBalance))
      ? -Number(storedOpeningBalance)
      : inferredOpeningBalance,
  );

  return {
    openingBalance,
    closingBalance,
    entries: withBalances(sortedEntries, openingBalance, true),
  };
};
