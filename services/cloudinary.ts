
// Cloudinary Configuration
const CLOUD_NAME = 'dmgudr4ot';
const API_KEY = '111849935255256';

// ⚠️ IMPORTANT: Replace this with your actual API Secret.
// In a production app, this should be an environment variable (e.g., import.meta.env.VITE_CLOUDINARY_SECRET)
// and ideally, signing should happen on a backend server to keep the secret hidden.
const API_SECRET = ''; 

export const uploadToCloudinary = async (file: File): Promise<string> => {
  if (!API_SECRET) {
    throw new Error("Cloudinary API Secret is missing. Please configure it in services/cloudinary.ts");
  }

  const timestamp = Math.round((new Date()).getTime() / 1000);
  const folder = 'cashflow_app'; // Dedicated folder as requested
  
  // 1. Prepare parameters to sign
  // Parameters must be alphabetical: folder, then timestamp
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`;
  
  // 2. Generate SHA-1 Signature using browser crypto API
  const msgBuffer = new TextEncoder().encode(paramsToSign);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 3. Build FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('folder', folder);
  formData.append('signature', signature);

  // 4. Upload
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Image upload failed');
  }

  return data.secure_url;
};
