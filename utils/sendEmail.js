const sgMail = require('@sendgrid/mail');
const { 
  createWelcomeTemplate, 
  createOTPTemplate,
  createOrderConfirmationTemplate,
  createPasswordResetOTPTemplate  
} = require("./emailTemplate");

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendMail = async ({ to, subject, html, attachments = [] }) => {
  console.log(" Attempting to send email via SendGrid to:", to);
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error(" SENDGRID_API_KEY not set in environment");
    return false;
  }

  try {
    const msg = {
      to,
      from: process.env.EMAIL || 'noreply@hive.com',
      subject,
      html,
      attachments
    };

    const response = await sgMail.send(msg);
    console.log(" Email sent successfully via SendGrid");
    return true;

  } catch (error) {
    console.error(" SendGrid error:", error.message);
    if (error.response?.body?.errors) {
      console.error(" Error details:", error.response.body.errors);
    }
    return false;
  }
};

// WELCOME EMAIL (Initial Registration)
const sendWelcomeEmail = async ({ firstName, lastName, email }) => {
  console.log(" sendWelcomeEmail called for:", email);
  const fullName = `${firstName} ${lastName}`;
  const subject = "Welcome to Hive";
  const html = createWelcomeTemplate(fullName);
  return await sendMail({ to: email, subject, html });
};

// OTP VERIFICATION EMAIL (Phone/Email Verification)
const sendOTPEmail = async ({ firstName, lastName, email, otp }) => {
  console.log(" sendOTPEmail called for:", email);
  const fullName = `${firstName} ${lastName}`;
  const subject = "Your Hive Verification Code";
  const html = createOTPTemplate(fullName, otp);
  return await sendMail({ to: email, subject, html });
};

// PASSWORD RESET OTP EMAIL
const sendPasswordResetOTPEmail = async ({ firstName, lastName, email, otp }) => {
  console.log(" sendPasswordResetOTPEmail called for:", email);
  const fullName = `${firstName} ${lastName}`;
  const subject = "Reset Your Hive Password";
  const html = createPasswordResetOTPTemplate(fullName, otp);
  return await sendMail({ to: email, subject, html });
};

// ORDER CONFIRMATION EMAIL
const sendOrderConfirmationEmail = async ({ 
  firstName,
  lastName,
  email, 
  orderId, 
  orderDate,
  items,
  subtotal,
  shipping,
  total,
  shippingAddress,
  trackingUrl
}) => {
  console.log(" sendOrderConfirmationEmail called for:", email);
  const fullName = `${firstName} ${lastName}`;
  const subject = `Order Confirmation - #${orderId}`;
  const html = createOrderConfirmationTemplate(
    fullName,
    orderId,
    orderDate,
    items,
    subtotal,
    shipping,
    total,
    shippingAddress,
    trackingUrl
  );
  return await sendMail({ to: email, subject, html });
};

module.exports = { 
  sendWelcomeEmail, 
  sendOTPEmail,
  sendPasswordResetOTPEmail,  
  sendOrderConfirmationEmail,
  sendMail 
};