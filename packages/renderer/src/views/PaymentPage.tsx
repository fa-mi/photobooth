import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess: () => void;
          onClose: () => void;
        }
      ) => void;
    };
  }
}

type Props = {
  onPaymentSuccess: () => void;
};

const PaymentPage: React.FC<Props> = ({ onPaymentSuccess }) => {
  // eslint-disable-next-line no-undef
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleSnapPay = async (amount: number) => {
    try {
      const response = await fetch('http://localhost:8181/midtrans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: 666, 
            item_id: 'Order-'.concat(Date.now().toString()), 
            amount, 
            item_name: 'Photo Session' }), // send selected amount
      });
      const json = await response.json();
      const token = json.data?.token;

      console.log(json);

      if (!token) {
        throw new Error('Snap token missing from backend');
      }
  
      const id = setTimeout(() => {
        alert('Payment session expired.');
        window.location.reload();
      }, 120000);
  
      setTimeoutId(id);
  
      window.snap.pay(token, {
        onSuccess () {
          console.log('Payment success');
          clearTimeout(id);
          localStorage.setItem('paymentStatus', 'paid');
          onPaymentSuccess();
          window.api.send('transition', { type: 'PAID' });
        },
        onClose () {
          clearTimeout(id);
          alert('Payment was not completed.');
        },
      });
    } catch (err) {
      console.error(err);
      alert('Error creating payment.');
    }
  };  

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', 'Mid-client-cGoMCrBbE2AQAGOu');
    script.async = true;
    
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const paid = localStorage.getItem('paymentStatus');
    if (paid === 'paid') {
      onPaymentSuccess();
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 text-gray-900 p-6">
      <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-lg w-full text-center">
        <h1 className="text-5xl font-extrabold text-blue-600 mb-6">Selamat Datang!</h1>
        <p className="text-lg mb-10 text-gray-700">
          Silahkan pilih paket untuk melanjutkan. Pembayaran diperlukan sebelum menggunakan photobooth.
        </p>
  
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => handleSnapPay(1)}
            className="bg-blue-500 hover:bg-blue-600 transition-all duration-200 text-white font-semibold py-4 rounded-xl text-2xl shadow-md"
          >
            100K - 8 photos
          </button>
  
          <button
            onClick={() => handleSnapPay(1)}
            className="bg-blue-400 hover:bg-blue-500 transition-all duration-200 text-white font-semibold py-4 rounded-xl text-2xl shadow-md"
          >
            50K - 4 photos
          </button>
        </div>
  
        <p className="text-sm mt-8 text-gray-500">
          ©FahmiAquinas
        </p>
      </div>
    </div>
  );  
};

export default PaymentPage;
