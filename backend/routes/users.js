const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/users/login - User login
router.post('/login', async (req, res) => {
  try {
    const { wallet, adminCode } = req.body || {};
    
    if (!wallet) {
      return res.status(400).json({
        ok: false,
        message: 'Wallet address is required'
      });
    }

    // Simple admin check (you can enhance this later)
    const isAdmin = adminCode === process.env.ADMIN_SECRET_CODE;
    
    const token = jwt.sign(
      { 
        userId: wallet.toLowerCase(), 
        wallet: wallet.toLowerCase(), 
        isAdmin 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      ok: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          wallet: wallet.toLowerCase(),
          isAdmin
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      ok: false,
      message: 'Login failed'
    });
  }
});

// GET /api/users/me - Get current user info
const auth = require('../middleware/auth');
router.get('/me', auth, (req, res) => {
  res.json({
    ok: true,
    data: {
      user: req.user
    }
  });
});

module.exports = router;