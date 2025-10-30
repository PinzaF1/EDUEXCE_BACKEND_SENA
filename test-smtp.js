// TEST SMTP - Ejecutar con: node test-smtp.js
// Este script prueba la conexión SMTP de forma aislada

const nodemailer = require('nodemailer');

// CONFIGURACIÓN (cambiar si es necesario)
const config = {
  host: 'sandbox.smtp.mailtrap.io',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'ae008d2b60a88d',
    pass: 'e451de5a5b6b42'
  }
};

console.log('🔧 Probando conexión SMTP...');
console.log('Configuración:', {
  host: config.host,
  port: config.port,
  user: config.auth.user,
  secure: config.secure
});
console.log('');

const transporter = nodemailer.createTransport(config);

// Test 1: Verificar conexión
console.log('📡 Test 1: Verificando conexión...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ERROR de conexión:');
    console.error(error);
    console.log('');
    console.log('💡 Posibles causas:');
    console.log('   - Credenciales incorrectas o expiradas');
    console.log('   - Puerto bloqueado por firewall');
    console.log('   - Sin conexión a internet');
    console.log('   - Host SMTP incorrecto');
  } else {
    console.log('✅ Conexión exitosa al servidor SMTP');
    console.log('');
    
    // Test 2: Enviar email de prueba
    console.log('📧 Test 2: Enviando email de prueba...');
    
    transporter.sendMail({
      from: 'no-reply@eduexce.local',
      to: 'test@example.com', // Mailtrap captura cualquier email
      subject: 'Test SMTP - EDUEXCE Backend',
      text: 'Este es un email de prueba para verificar la configuración SMTP.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1976D2;">🎉 Test Exitoso</h2>
          <p>Si ves este email en Mailtrap, la configuración SMTP funciona correctamente.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    }, (error, info) => {
      if (error) {
        console.error('❌ ERROR al enviar email:');
        console.error(error);
      } else {
        console.log('✅ Email enviado exitosamente');
        console.log('📋 Detalles:', info);
        console.log('');
        console.log('🎯 Siguiente paso:');
        console.log('   Verifica en https://mailtrap.io/inboxes que el email haya llegado');
      }
    });
  }
});

