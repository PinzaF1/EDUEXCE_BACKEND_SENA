// TEST SMTP - Ejecutar con: node test-smtp.js
// Este script prueba la conexión SMTP de forma aislada

const nodemailer = require('nodemailer');

// CONFIGURACIÓN BREVO (reemplaza con tus credenciales)
const config = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'TU_LOGIN_BREVO_AQUI@smtp-brevo.com',  // Tu login de Brevo
    pass: 'xsmtpsib-TU_CLAVE_SMTP_DE_BREVO_AQUI'  // La key que generaste en Brevo
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
    console.log('   FROM: tu-email-de-registro-brevo@gmail.com (remitente verificado)');
    console.log('   TO: tu-email-personal@gmail.com (destinatario)');
    console.log('');
    
    transporter.sendMail({
      from: 'tu-email-de-registro-brevo@gmail.com', // Email con el que te registraste en Brevo (VERIFICADO)
      to: 'tu-email-personal@gmail.com', // Email donde quieres RECIBIR el test
      subject: 'Test SMTP - EDUEXCE Backend con Brevo',
      text: 'Este es un email de prueba para verificar la configuración SMTP con Brevo.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1976D2;">🎉 Test Exitoso con Brevo</h2>
          <p>Si ves este email en tu bandeja de entrada, ¡la configuración SMTP con Brevo funciona correctamente!</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p style="color: #666; margin-top: 30px;">Este es un email de prueba del backend EDUEXCE.</p>
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
        console.log('   ¡Revisa tu bandeja de entrada! El email debería llegar en segundos.');
      }
    });
  }
});

