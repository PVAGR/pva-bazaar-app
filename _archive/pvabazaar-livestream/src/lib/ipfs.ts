import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

export const pinFileToIPFS = async (file: File) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  const data = new FormData();
  data.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
  });
  data.append('pinataMetadata', metadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });
  data.append('pinataOptions', pinataOptions);

  try {
    const res = await axios.post(url, data, {
      maxBodyLength: Infinity, // This is needed to prevent axios from throwing an error with large files
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      },
    });
    return res.data;
  } catch (error) {
    console.error('Error pinning file to IPFS:', error);
    throw error;
  }
};

export const pinStreamToIPFS = async (stream: Readable, fileName: string) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  const data = new FormData();
  data.append('file', stream, { filename: fileName });

  const metadata = JSON.stringify({
    name: fileName,
  });
  data.append('pinataMetadata', metadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  });
  data.append('pinataOptions', pinataOptions);

  try {
    const res = await axios.post(url, data, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      },
    });
    return res.data;
  } catch (error) {
    console.error('Error pinning stream to IPFS:', error);
    throw error;
  }
};