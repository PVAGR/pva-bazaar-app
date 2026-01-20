const Artifact = require("../models/Artifact");
const { v4: uuidv4 } = require("uuid");

function isInStock(doc) {
  if (!doc) return false;
  if (doc.isUnlimited) return true;
  return (doc.stockQty || 0) - (doc.reservedQty || 0) - (doc.soldQty || 0) > 0;
}

async function reserveOne(itemId, reservationId) {
  const filter = {
    _id: itemId,
    $or: [
      { isUnlimited: true },
      { $expr: { $gt: [ { $subtract: ["$stockQty", { $add: ["$reservedQty", "$soldQty"] }] }, 0 ] } }
    ]
  };
  const update = {
    $inc: { reservedQty: 1 },
    $addToSet: { reservations: reservationId },
  };
  const doc = await Artifact.findOneAndUpdate(filter, update, { new: true });
  if (!doc) return { ok: false, error: "sold_out" };
  return { ok: true, doc };
}

async function releaseReservation(reservationId) {
  const doc = await Artifact.findOneAndUpdate(
    { reservations: reservationId },
    { $inc: { reservedQty: -1 }, $pull: { reservations: reservationId } },
    { new: true }
  );
  return !!doc;
}

async function finalizeSale(reservationId) {
  const doc = await Artifact.findOneAndUpdate(
    { reservations: reservationId },
    { $inc: { reservedQty: -1, soldQty: 1 }, $pull: { reservations: reservationId } },
    { new: true }
  );
  return !!doc;
}

module.exports = {
  isInStock,
  reserveOne,
  releaseReservation,
  finalizeSale,
};
