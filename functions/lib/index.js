"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBid = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
exports.placeBid = functions.https.onCall(async (data, context) => {
    var _a;
    const { streamId, productId, amount } = data || {};
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "Login required");
    }
    if (!streamId || !productId || typeof amount !== "number") {
        throw new functions.https.HttpsError("invalid-argument", "Missing/invalid fields");
    }
    const productRef = db.doc(`livestreams/${streamId}/products/${productId}`);
    const bidsCol = productRef.collection("bids");
    const streamRef = db.doc(`livestreams/${streamId}`);
    return db.runTransaction(async (tx) => {
        const [streamSnap, productSnap] = await Promise.all([
            tx.get(streamRef),
            tx.get(productRef)
        ]);
        if (!streamSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Stream not found");
        }
        if (!productSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Product not found");
        }
        const stream = streamSnap.data();
        if (stream.status !== "live") {
            throw new functions.https.HttpsError("failed-precondition", "Stream not live");
        }
        const product = productSnap.data();
        if (product.status !== "active") {
            throw new functions.https.HttpsError("failed-precondition", "Auction not active");
        }
        const now = admin.firestore.Timestamp.now();
        if (product.endAt && product.endAt.toMillis() <= now.toMillis()) {
            throw new functions.https.HttpsError("deadline-exceeded", "Auction ended");
        }
        const currentHigh = Number(product.highestBid || 0);
        const minInc = Number(product.minIncrement || 1);
        if (amount < currentHigh + minInc) {
            throw new functions.https.HttpsError("failed-precondition", "Bid too low");
        }
        const bidRef = bidsCol.doc();
        tx.set(bidRef, {
            amount,
            bidderUid: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        tx.update(productRef, {
            highestBid: amount,
            highestBidderUid: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, highestBid: amount, highestBidderUid: uid };
    });
});
//# sourceMappingURL=index.js.map