// import * as React from 'react';
// import { render } from 'react-dom';
// import { App } from './app';

// const root = document.getElementById('root');
// if (!root) {
//   throw new Error('no document root');
// }

// render(<App />, root);

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { App } from './app';
import './index.css';
import PaymentPage from './views/PaymentPage';

const RootApp = () => {
  const [paid, setPaid] = useState(() => localStorage.getItem('paymentStatus') === 'paid');

  console.log(paid);
  if (!paid) {
    return <PaymentPage onPaymentSuccess={() => setPaid(true)} />;
  }

  return <App />;
};

ReactDOM.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
  document.getElementById('root'),
);
