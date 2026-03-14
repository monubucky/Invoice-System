import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { generateInvoiceHTML, generatePDF } from '../services/pdf.service';
import { stripeCheckoutPublic } from '../controllers/payment.controller';


const router = Router();

// Get invoice by public token (no auth required)
router.get('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { publicToken: req.params.token[0] },
      include: {
        client: true,
        items: true,
        payments: true,
        business: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    // Mark as VIEWED if SENT
    if (invoice.status === 'SENT') {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'VIEWED' },
      });
    }

    const amountPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount), 0
    );

    res.status(200).json({
      invoice: {
        ...invoice,
        amountPaid,
        balanceDue: Number(invoice.total) - amountPaid,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Download PDF via public token
router.get('/:token/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { publicToken: req.params.token[0] },
      include: { client: true, items: true, payments: true, business: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const html = generateInvoiceHTML(
      invoice as any,
      invoice.business?.name || 'Your Business',
      invoice.business?.currency || 'USD'
    );

    const pdfBuffer = await generatePDF(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

router.post('/:token/pay', stripeCheckoutPublic);


export default router;