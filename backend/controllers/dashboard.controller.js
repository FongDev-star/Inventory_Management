import Sale from "../models/sale.model.js";
import Product from "../models/product.model.js";
import InventoryTransaction from "../models/inventoryTransaction.model.js";

const TIMEZONE = "Asia/Phnom_Penh";
const TZ_OFFSET = "+07:00";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const round2 = (n) => Math.round((n || 0) * 100) / 100;

export const getSummary = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);

    // list of day keys (YYYY-MM-DD) from oldest to today, in Phnom Penh time
    const dayKeys = [];
    for (let i = days - 1; i >= 0; i--) {
      dayKeys.push(dayFormatter.format(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
    }
    const from = new Date(`${dayKeys[0]}T00:00:00${TZ_OFFSET}`);

    const rangeMatch = { createdAt: { $gte: from } };

    const [
      totalProducts,
      stockProducts,
      totalsAgg,
      chartAgg,
      topAgg,
      recentSales,
      recentMovements,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),

      Product.find({
        isActive: true,
        $expr: { $lte: ["$stock", "$lowStockThreshold"] },
      })
        .select("name sku stock lowStockThreshold")
        .sort({ stock: 1 }),

      Sale.aggregate([
        { $match: rangeMatch },
        {
          $group: {
            _id: null,
            salesCount: { $sum: 1 },
            revenue: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] },
            },
            cost: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalCost", 0] },
            },
            outstanding: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$total", 0] },
            },
          },
        },
      ]),

      Sale.aggregate([
        { $match: rangeMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: TIMEZONE,
              },
            },
            sales: { $sum: 1 },
            revenue: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$total", 0] },
            },
          },
        },
      ]),

      Sale.aggregate([
        { $match: rangeMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            sku: { $first: "$items.sku" },
            unitsSold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.subtotal" },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
      ]),

      Sale.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("createdBy", "name")
        .select("receiptNumber customerName total paymentStatus createdAt createdBy"),

      InventoryTransaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("product", "name sku")
        .populate("createdBy", "name"),
    ]);

    const totals = totalsAgg[0] || {
      salesCount: 0,
      revenue: 0,
      cost: 0,
      outstanding: 0,
    };

    const chartMap = new Map(chartAgg.map((d) => [d._id, d]));
    const salesChart = dayKeys.map((key) => ({
      date: key,
      sales: chartMap.get(key)?.sales || 0,
      revenue: round2(chartMap.get(key)?.revenue),
    }));

    res.status(200).json({
      rangeDays: days,
      timezone: TIMEZONE,
      totals: {
        products: totalProducts,
        salesCount: totals.salesCount,
        revenue: round2(totals.revenue),
        profit: round2(totals.revenue - totals.cost),
        outstanding: round2(totals.outstanding),
        lowStockCount: stockProducts.filter((p) => p.stock > 0).length,
        outOfStockCount: stockProducts.filter((p) => p.stock === 0).length,
      },
      lowStockProducts: stockProducts.filter((p) => p.stock > 0).slice(0, 10),
      outOfStockProducts: stockProducts.filter((p) => p.stock === 0).slice(0, 10),
      topProducts: topAgg.map((p) => ({
        productId: p._id,
        name: p.name,
        sku: p.sku,
        unitsSold: p.unitsSold,
        revenue: round2(p.revenue),
      })),
      salesChart,
      recentSales,
      recentMovements,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};