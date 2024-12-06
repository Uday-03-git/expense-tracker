const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // Ensure the URI is correct in .env file
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
connectDB();

// User schema and model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Expense model
const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
});

const Expense = mongoose.model('Expense', expenseSchema);

// Routes

// User registration (sign up)
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const newUser = new User({ email, password });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error signing up', error: err.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

// Add a new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    const newExpense = new Expense({ amount, category, description, date });
    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (err) {
    res.status(500).json({ message: 'Error adding expense', error: err.message });
  }
});

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.status(200).json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving expenses', error: err.message });
  }
});

// Generate reports by date range, including amount, category, description, and date
app.get('/api/reports', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const expenses = await Expense.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lt: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          expenses: { $push: { amount: '$amount', category: '$category', description: '$description', date: '$date' } },
        },
      },
    ]);
    res.status(200).json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Error generating report', error: err.message });
  }
});

// Server setup
const PORT = process.env.PORT || 5003; // Changed to 5003 as per your requirement
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
