// Set required env vars before any module loads (dotenv won't override these)
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
process.env.RAZORPAY_KEY_ID = 'rzp_test_testkey';
process.env.RAZORPAY_KEY_SECRET = 'testsecretkeyvalue';
process.env.RAZORPAY_WEBHOOK_SECRET = 'testwebhooksecretvalue';
