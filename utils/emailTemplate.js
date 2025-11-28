// WELCOME EMAIL TEMPLATE
const createWelcomeTemplate = (fullName) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to Hive</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000000; background-color: #ffffff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      
      <!-- Header -->
      <div style="background-color: #000000; padding: 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase;">HIVE</h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 60px 40px;">
        
        <!-- Greeting -->
        <div style="margin-bottom: 40px; text-align: center;">
          <h2 style="color: #000000; margin: 0 0 16px 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
            Welcome to Hive
          </h2>
          <p style="color: #666666; margin: 0; font-size: 16px; font-weight: 400; letter-spacing: 0.5px;">
            Hello ${fullName},
          </p>
        </div>

        <!-- Message -->
        <div style="margin-bottom: 50px;">
          <p style="color: #000000; margin: 0 0 24px 0; font-size: 16px; font-weight: 400; line-height: 1.8; text-align: center;">
            Thank you for joining Hive. Your account has been successfully created.
          </p>
          <p style="color: #666666; margin: 0; font-size: 16px; font-weight: 400; line-height: 1.8; text-align: center;">
            You're now part of our fashion community. Start exploring our latest collections and exclusive pieces.
          </p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin-bottom: 50px;">
          <a href="${process.env.CLIENT_URL || 'https://hivethread.com'}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 14px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; transition: all 0.3s;">
            Start Shopping
          </a>
        </div>

        <!-- Divider -->
        <div style="border-bottom: 1px solid #e5e5e5; margin: 50px 0;"></div>

        <!-- Support -->
        <div style="text-align: center;">
          <p style="color: #666666; margin: 0 0 8px 0; font-size: 14px; font-weight: 400; letter-spacing: 0.5px;">
            Questions? We're here to help.
          </p>
          <a href="mailto:support@hivefashion.com" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
            support@hive.com
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 40px; text-align: center;">
        <p style="color: #999999; margin: 0 0 8px 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          © 2025 Hive. All rights reserved.
        </p>
        <p style="color: #999999; margin: 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          Crafted for the modern wardrobe.
        </p>
      </div>
    </div>
  </body>
</html>
`;
};

// OTP VERIFICATION EMAIL TEMPLATE
const createOTPTemplate = (fullName, otp) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Phone - Hive</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000000; background-color: #ffffff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      
      <!-- Header -->
      <div style="background-color: #000000; padding: 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase;">HIVE</h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 60px 40px;">
        
        <!-- Greeting -->
        <div style="margin-bottom: 40px; text-align: center;">
          <h2 style="color: #000000; margin: 0 0 16px 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
            Email Verification
          </h2>
          <p style="color: #666666; margin: 0; font-size: 16px; font-weight: 400; letter-spacing: 0.5px;">
            Hello ${fullName},
          </p>
        </div>

        <!-- Message -->
        <div style="margin-bottom: 40px;">
          <p style="color: #000000; margin: 0 0 24px 0; font-size: 16px; font-weight: 400; line-height: 1.8; text-align: center;">
            To continue shopping, please verify your email using the code below.
          </p>
        </div>

        <!-- OTP Code -->
        <div style="background-color: #f5f5f5; border: 2px solid #000000; padding: 32px; margin-bottom: 40px; text-align: center;">
          <p style="color: #666666; margin: 0 0 16px 0; font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;">
            Your Verification Code
          </p>
          <p style="color: #000000; margin: 0; font-size: 42px; font-weight: 600; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>

        <!-- Warning -->
        <div style="background-color: #000000; padding: 20px; margin-bottom: 40px; text-align: center;">
          <p style="color: #ffffff; margin: 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
        </div>

        <!-- Additional Info -->
        <div style="text-align: center;">
          <p style="color: #666666; margin: 0; font-size: 14px; font-weight: 400; letter-spacing: 0.5px; line-height: 1.8;">
            If you didn't request this code, please ignore this email or contact our support team.
          </p>
        </div>

        <!-- Divider -->
        <div style="border-bottom: 1px solid #e5e5e5; margin: 50px 0;"></div>

        <!-- Support -->
        <div style="text-align: center;">
          <p style="color: #666666; margin: 0 0 8px 0; font-size: 14px; font-weight: 400; letter-spacing: 0.5px;">
            Need assistance?
          </p>
          <a href="mailto:support@hive.com" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
            support@hive.com
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 40px; text-align: center;">
        <p style="color: #999999; margin: 0 0 8px 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          © 2025 Hive. All rights reserved.
        </p>
        <p style="color: #999999; margin: 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          Crafted for the modern wardrobe.
        </p>
      </div>
    </div>
  </body>
</html>
`;
};

// ORDER CONFIRMATION EMAIL TEMPLATE
const createOrderConfirmationTemplate = (
  fullName,
  orderId,
  orderDate,
  items,
  subtotal,
  shipping,
  total,
  shippingAddress,
  trackingUrl
) => {
  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding: 20px 0; border-bottom: 1px solid #e5e5e5;">
        <p style="color: #000000; margin: 0 0 4px 0; font-size: 15px; font-weight: 500; letter-spacing: 0.5px;">
          ${item.name}
        </p>
        <p style="color: #666666; margin: 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px;">
          Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity}
        </p>
      </td>
      <td style="padding: 20px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
        <p style="color: #000000; margin: 0; font-size: 15px; font-weight: 500; letter-spacing: 0.5px;">
          ₦${item.price.toLocaleString()}
        </p>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmation - Hive</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000000; background-color: #ffffff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      
      <!-- Header -->
      <div style="background-color: #000000; padding: 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase;">HIVE</h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 60px 40px;">
        
        <!-- Greeting -->
        <div style="margin-bottom: 40px; text-align: center;">
          <h2 style="color: #000000; margin: 0 0 16px 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
            Order Confirmed
          </h2>
          <p style="color: #666666; margin: 0; font-size: 16px; font-weight: 400; letter-spacing: 0.5px;">
            Thank you for your order, ${fullName}
          </p>
        </div>

        <!-- Order Details -->
        <div style="background-color: #f5f5f5; padding: 30px; margin-bottom: 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 16px;">
                <p style="color: #666666; margin: 0 0 4px 0; font-size: 12px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                  Order Number
                </p>
                <p style="color: #000000; margin: 0; font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">
                  #${orderId}
                </p>
              </td>
              <td style="padding-bottom: 16px; text-align: right;">
                <p style="color: #666666; margin: 0 0 4px 0; font-size: 12px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                  Order Date
                </p>
                <p style="color: #000000; margin: 0; font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">
                  ${orderDate}
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Items -->
        <div style="margin-bottom: 40px;">
          <p style="color: #000000; margin: 0 0 24px 0; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
            Order Items
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsHTML}
          </table>
        </div>

        <!-- Totals -->
        <div style="margin-bottom: 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0;">
                <p style="color: #666666; margin: 0; font-size: 15px; font-weight: 400; letter-spacing: 0.5px;">
                  Subtotal
                </p>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <p style="color: #000000; margin: 0; font-size: 15px; font-weight: 500; letter-spacing: 0.5px;">
                  ₦${subtotal.toLocaleString()}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                <p style="color: #666666; margin: 0; font-size: 15px; font-weight: 400; letter-spacing: 0.5px;">
                  Shipping
                </p>
              </td>
              <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e5e5e5;">
                <p style="color: #000000; margin: 0; font-size: 15px; font-weight: 500; letter-spacing: 0.5px;">
                  ₦${shipping.toLocaleString()}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 0;">
                <p style="color: #000000; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">
                  Total
                </p>
              </td>
              <td style="padding: 20px 0; text-align: right;">
                <p style="color: #000000; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">
                  ₦${total.toLocaleString()}
                </p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Shipping Address -->
        <div style="background-color: #f5f5f5; padding: 30px; margin-bottom: 40px;">
          <p style="color: #000000; margin: 0 0 16px 0; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
            Shipping Address
          </p>
          <p style="color: #666666; margin: 0; font-size: 15px; font-weight: 400; line-height: 1.8; letter-spacing: 0.5px;">
            ${shippingAddress.street}<br/>
            ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}<br/>
            ${shippingAddress.country}
          </p>
        </div>

        ${trackingUrl ? `
        <!-- Track Order -->
        <div style="text-align: center; margin-bottom: 40px;">
          <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 16px 48px; font-size: 14px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; transition: all 0.3s;">
            Track Order
          </a>
        </div>
        ` : ''}

        <!-- Divider -->
        <div style="border-bottom: 1px solid #e5e5e5; margin: 50px 0;"></div>

        <!-- Support -->
        <div style="text-align: center;">
          <p style="color: #666666; margin: 0 0 8px 0; font-size: 14px; font-weight: 400; letter-spacing: 0.5px;">
            Questions about your order?
          </p>
          <a href="mailto:support@hivefashion.com" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
            support@hive.com
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 40px; text-align: center;">
        <p style="color: #999999; margin: 0 0 8px 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          © 2025 Hive. All rights reserved.
        </p>
        <p style="color: #999999; margin: 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          Crafted for the modern wardrobe.
        </p>
      </div>
    </div>
  </body>
</html>
`;
};

// PASSWORD RESET EMAIL TEMPLATE
// PASSWORD RESET OTP EMAIL TEMPLATE
const createPasswordResetOTPTemplate = (fullName, otp) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Password - Hive</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #000000; background-color: #ffffff; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      
      <!-- Header -->
      <div style="background-color: #000000; padding: 40px; text-align: center; border-bottom: 1px solid #e5e5e5;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase;">HIVE</h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 60px 40px;">
        
        <!-- Greeting -->
        <div style="margin-bottom: 40px; text-align: center;">
          <h2 style="color: #000000; margin: 0 0 16px 0; font-size: 28px; font-weight: 300; letter-spacing: 1px;">
            Password Reset Request
          </h2>
          <p style="color: #666666; margin: 0; font-size: 16px; font-weight: 400; letter-spacing: 0.5px;">
            Hello ${fullName},
          </p>
        </div>

        <!-- Message -->
        <div style="margin-bottom: 40px;">
          <p style="color: #000000; margin: 0 0 24px 0; font-size: 16px; font-weight: 400; line-height: 1.8; text-align: center;">
            We received a request to reset your password. Use the code below to continue with your password reset.
          </p>
        </div>

        <!-- OTP Code -->
        <div style="background-color: #f5f5f5; border: 2px solid #000000; padding: 32px; margin-bottom: 40px; text-align: center;">
          <p style="color: #666666; margin: 0 0 16px 0; font-size: 12px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;">
            Your Reset Code
          </p>
          <p style="color: #000000; margin: 0; font-size: 42px; font-weight: 600; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>

        <!-- Warning -->
        <div style="background-color: #000000; padding: 20px; margin-bottom: 40px; text-align: center;">
          <p style="color: #ffffff; margin: 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px;">
            This code expires in 10 minutes. Do not share it with anyone.
          </p>
        </div>

        <!-- Security Notice -->
        <div style="background-color: #f5f5f5; border-left: 3px solid #000000; padding: 20px; margin-bottom: 40px;">
          <p style="color: #000000; margin: 0 0 8px 0; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
            Security Notice
          </p>
          <p style="color: #666666; margin: 0; font-size: 13px; font-weight: 400; letter-spacing: 0.5px; line-height: 1.6;">
            If you didn't request a password reset, please ignore this email or contact our support team immediately.
          </p>
        </div>

        <!-- Divider -->
        <div style="border-bottom: 1px solid #e5e5e5; margin: 50px 0;"></div>

        <!-- Support -->
        <div style="text-align: center;">
          <p style="color: #666666; margin: 0 0 8px 0; font-size: 14px; font-weight: 400; letter-spacing: 0.5px;">
            Need assistance?
          </p>
          <a href="mailto:support@hive.com" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
            support@hive.com
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 40px; text-align: center;">
        <p style="color: #999999; margin: 0 0 8px 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          © 2025 Hive. All rights reserved.
        </p>
        <p style="color: #999999; margin: 0; font-size: 12px; font-weight: 400; letter-spacing: 0.5px;">
          Crafted for the modern wardrobe.
        </p>
      </div>
    </div>
  </body>
</html>
`;
};

module.exports = {
  createWelcomeTemplate,
  createOTPTemplate,
  createOrderConfirmationTemplate,
  createPasswordResetOTPTemplate,
};