
import React from 'react';
import Spinner from './Spinner';

const QRCode = ({ data }) => {
  const [imgSrc, setImgSrc] = React.useState(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data)}`;
    setImgSrc(url);
  }, [data]);
  
  if (error) {
    return <div className="text-red-500 text-center">Could not load QR Code.</div>;
  }

  if (!imgSrc) {
    return <Spinner />;
  }

  return (
    <div className="flex justify-center">
        <img 
            src={imgSrc} 
            alt="Booking QR Code" 
            width="250" 
            height="250" 
            onError={() => setError(true)}
            className="rounded-lg shadow-lg"
        />
    </div>
  );
};

export default QRCode;
