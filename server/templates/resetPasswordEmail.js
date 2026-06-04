module.exports = function(resetLink) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="background:#0a0f1f; color:#b8eaff; font-family:'Orbitron', sans-serif;">
    <div style="max-width:600px; margin:auto; padding:30px; border:2px solid #00eaff; border-radius:10px;">
      <h1 style="color:#00eaff; text-align:center;">Password Reset</h1>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}" style="background:#00eaff; padding:12px 20px; color:#000; text-decoration:none; border-radius:6px;">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    </div>
  </body>
  </html>
  `;
};
