const firebaseConfig = {
  type: "service_account",
  project_id: "sbs-sso-68cad",
  private_key_id: "e6c7d51ab337410972e3f3f7724ccb77be46f230",
  private_key: process.env.FIREBASE_KEY,
  client_email: "firebase-adminsdk-fbsvc@sbs-sso-68cad.iam.gserviceaccount.com",
  client_id: "110101873153754165356",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40sbs-sso-68cad.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

module.exports = firebaseConfig;
