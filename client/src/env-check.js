console.log('Environment Variables:');
console.log('VITE_RAZORPAY_KEY_ID:', import.meta.env.VITE_RAZORPAY_KEY_ID);

// Export a dummy function to avoid unused file warnings
export const checkEnv = () => {
    return import.meta.env.VITE_RAZORPAY_KEY_ID;
};