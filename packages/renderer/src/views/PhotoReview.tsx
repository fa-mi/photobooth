import * as React from 'react';
import clsx from 'clsx';
import { useTransitionIndex, transition } from '../modules';
import type { Props } from './props';
import { ReviewLayout } from '../layouts';
import { H2, Photo, QrCode, Text } from '../components';
import { useLocation, usePreference } from '../context';

export function PhotoReview({ status }: Props) {
  const {
    state: { photos },
  } = useLocation();
  const [url] = usePreference('photoboothUrl');
  const index = useTransitionIndex();

  const handleDone = () => {
    localStorage.setItem('paymentStatus', 'unpaid');
    window.location.reload(); // or navigate if using React Router
  };

  return (
    <ReviewLayout
      card={
        <>
          <H2>Scan to download:</H2>
          <QrCode url={url} />
          <Text className="underline text-teal-700 text-4xl">{url}</Text>

          <button
            onClick={handleDone}
            className="mt-6 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-xl shadow-md transition-all"
          >
            Done
          </button>
          
        </>
      }
      status={status}
      title={titles[photos.length % titles.length]}
    >
      <div className={clsx('absolute shadow-2xl', transition(status, 'zoomRotate', index))}>
        <Photo src={`pb:${photos[photos.length - 1]}`} />
      </div>
    </ReviewLayout>
  );
}

const titles = ['Great shots!', 'Super cool!', 'Lookin’ good!', '🥳 😎 🥸', 'You’re a natural!'];
