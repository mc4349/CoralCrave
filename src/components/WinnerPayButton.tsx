import { useEffect, useRef, useState } from "react";

type Props = {
  streamId: string;
  productId: string;
  amountUSD: number;     // final price
  isWinner: boolean;
};

export default function WinnerPayButton({ streamId, productId, amountUSD, isWinner }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (!isWinner || !ref.current) return;

    // Load PayPal JS SDK with your client-id (client ID is okay to expose)
    const script = document.createElement("script");
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) { setError("Missing PayPal client id"); return; }
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.onload = async () => {
      // @ts-ignore
      if (!window.paypal) { setError("PayPal SDK failed"); return; }

      // @ts-ignore
      window.paypal.Buttons({
        createOrder: async () => {
          const res = await fetch("/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ streamId, productId, amountUSD }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "create-order failed");
          return data.orderId;
        },
        onApprove: async (data: any) => {
          const res = await fetch("/paypal/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const out = await res.json();
          if (!res.ok) throw new Error(out.error || "capture failed");
          alert("Payment successful!");
        },
        onError: (err: any) => {
          console.error(err);
          setError("Payment failed");
        }
      }).render(ref.current!);
    };
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [isWinner, streamId, productId, amountUSD]);

  if (!isWinner) return null;
  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <h4 className="text-green-800 font-semibold mb-2">🎉 Congratulations! You won!</h4>
      <p className="text-green-700 text-sm mb-3">
        Complete your payment of ${amountUSD.toFixed(2)} to claim your item.
      </p>
      <div ref={ref} />
      {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
    </div>
  );
}
