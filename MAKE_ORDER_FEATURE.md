# Make Order Feature - Quick Deal Initiation

## Overview

The "Make Order" feature enables admin users to quickly initiate deals with counterparties through a streamlined workflow:

1. **Initiate**: Send email invite to counterparty with deal terms
2. **Accept**: Counterparty accepts and provides payment/crypto details
3. **Mock Confirm**: Both parties confirm order (emails sent as mock receipt)
4. **Execute**: Perform legitimate transaction on blockchain with full tracking

## User Flow

### Step 1: Make Order (Seller/Admin)

- Navigate to Admin Dashboard
- Click **"Make Order"** in Quick Actions
- Fill form:
  - **Counterparty Email**: Recipient email
  - **Counterparty Name**: Recipient name
  - **Amount**: Order amount
  - **Currency**: USD, EUR, GBP, ETH, USDC
  - **Description**: Item details
- Click **"Send Order Invite"**
- Counterparty receives email with deal link

### Step 2: Accept Deal (Counterparty)

- Receives email invitation
- Clicks deal link / logs in to accept
- Provides:
  - Crypto wallet address (or payment method)
  - Payment method preference
  - Additional info
- Submits acceptance
- Seller receives notification with payment details

### Step 3: Mock Confirm (Both Parties)

- Both parties log in and confirm mock payment
- Each receives confirmation email (like order receipt)
- Shows:
  - Item description
  - Amount
  - Deal ID
  - Status (CONFIRMED when both confirmed)

### Step 4: Execute (Blockchain)

- Real transaction created on blockchain
- Funds held in smart contract escrow
- All milestones and payments tracked on-chain
- Full audit trail available

## API Endpoints

### POST /api/deals/quick/initiate

Initiate a quick order and send invitation email

**Request:**

```json
{
  "counterpartyEmail": "buyer@example.com",
  "counterpartyName": "John Doe",
  "amount": 1000,
  "currency": "USD",
  "description": "Custom Afghan rug, 5x8ft",
  "contactMethod": "email"
}
```

**Response:**

```json
{
  "ok": true,
  "dealId": "507f1f77bcf86cd799439011",
  "item": { ...deal object... }
}
```

### POST /api/deals/:id/quick/accept

Counterparty accepts deal and provides payment info

**Request:**

```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42aE...",
  "paymentMethod": "crypto",
  "additionalInfo": "Will pay via USDC on Base network"
}
```

**Response:**

```json
{
  "ok": true,
  "item": { ...deal object with counterparty accepted... }
}
```

### POST /api/deals/:id/quick/mock-confirm

Both parties confirm mock payment

**Response:**

```json
{
  "ok": true,
  "item": { ...deal object with mock confirmation... }
}
```

## Email Templates

### Deal Initiation Email

- Sent to counterparty
- Contains:
  - Deal details (description, amount, currency)
  - Seller contact info
  - "View Deal" button linking to acceptance page
  - Next steps outline

### Deal Acceptance Email

- Sent to seller
- Contains:
  - Buyer information
  - Payment method provided
  - Wallet address / payment details
  - Next step (wait for both parties to mock confirm)

### Mock Confirmation Email

- Sent to both parties
- Contains:
  - Order receipt format
  - Item description
  - Total amount
  - Reference ID
  - Status (CONFIRMED if both parties confirmed)
  - Outline of next blockchain execution step

## Integration with Existing Deal System

The Quick Order feature creates standard Deal objects that are compatible with:

- Deal messaging and audit trail
- Mock escrow funding and confirmation
- Dispute resolution
- Mediator assignment
- Blockchain deployment

All existing deal workflows and features work with orders initiated via Quick Order endpoint.

## Environment Setup

Email notifications require:

```
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-specific-password
SMTP_HOST=smtp.gmail.com (or your provider)
SMTP_PORT=587
```

If email is not configured, orders still create successfully but without notifications.

## Future Enhancements

- SMS/Telegram notifications for deal updates
- Mobile app quick order scanning (QR codes)
- Bulk order templating
- Integration with accounting/invoicing systems
- Multi-signature confirmation workflows
- Automated payment settlement on blockchain
