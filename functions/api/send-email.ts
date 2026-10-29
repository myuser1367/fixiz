export async function onRequestPost(context: any) {
  try {
    const { subject, text, to, attachment } = await context.request.json();

    // کلید به جای هاردکد شدن، از متغیرهای محیطی دریافت می‌شود
    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    
    if (!to) {
      return new Response(JSON.stringify({ success: false, error: "Recipient email is required" }), { status: 400 });
    }

    const emailPayload: any = {
      from: "سامانه تعمیرات فرافن <info@fixiz.ir>",
      to: [to],
      subject: subject,
      text: text,
    };

    if (attachment && attachment.content && attachment.filename) {
      emailPayload.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
        }
      ];
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", data);
      return new Response(JSON.stringify({ success: false, error: data }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}