/**
 * Dashboard Controller
 * Handles role-based dashboard rendering with data aggregation
 */

const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const Review = require('../models/Review');
const mongoose = require('mongoose');

/**
 * Render role-based dashboard
 * GET /dashboard
 */
async function renderDashboard(req, res) {
  try {
    const userId = req.session.user.id;
    const role = req.query.role || req.session.user.role;

    // Render appropriate dashboard based on role
    if (role === 'saheli') {
      await renderSaheliDashboard(req, res, userId);
    } else if (role === 'customer') {
      await renderCustomerDashboard(req, res, userId);
    } else {
      return res.status(400).render('errors/404', {
        title: 'Invalid Role',
        message: 'Invalid user role for dashboard access'
      });
    }
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    res.status(500).render('errors/500', {
      title: 'Server Error',
      message: 'Failed to load dashboard'
    });
  }
};

/**
 * Render Saheli (Provider) Dashboard
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {String} userId - User ID
 */
async function renderSaheliDashboard(req, res, userId) {
  try {
    const providerId = new mongoose.Types.ObjectId(userId);

    // Aggregate booking stats
    const bookingStats = await Booking.aggregate([
      { $match: { providerId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
          },
          inProgressBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'InProgress'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
          },
          // Total Earnings = All advance payments received (excluding refunded) + All remaining payments
          totalEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Cancelled'] }, // If cancelled, subtract refunded amount
                { $subtract: ['$advancePaid', { $ifNull: ['$refundAmount', 0] }] },
                { 
                  $cond: [
                    { $eq: ['$paymentStatus', 'FullyPaid'] }, 
                    '$totalAmount', // Fully paid = total amount
                    '$advancePaid' // Otherwise count advance paid amount
                  ]
                }
              ]
            }
          },
          // Pending Earnings = Remaining amount from active bookings (not cancelled)
          pendingEarnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Cancelled'] }, // Not cancelled
                    { $eq: ['$paymentStatus', 'AdvancePaid'] } // Only advance paid
                  ]
                },
                '$remainingAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = bookingStats[0] || {
      totalBookings: 0,
      confirmedBookings: 0,
      inProgressBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalEarnings: 0,
      pendingEarnings: 0
    };

    // Debug logging for earnings calculation
    console.log('[DASHBOARD] Provider earnings stats:', {
      providerId: providerId.toString(),
      totalEarnings: stats.totalEarnings,
      pendingEarnings: stats.pendingEarnings,
      totalBookings: stats.totalBookings,
      cancelledBookings: stats.cancelledBookings
    });

    // Service stats
    const totalServices = await Service.countDocuments({ providerId });
    const activeServices = await Service.countDocuments({
      providerId,
      isActive: true,
      isPaused: false
    });
    const pausedServices = await Service.countDocuments({
      providerId,
      isPaused: true
    });

    // Average rating across services
    const ratingStats = await Service.aggregate([
      { $match: { providerId, reviewCount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$averageRating' },
          totalReviews: { $sum: '$reviewCount' }
        }
      }
    ]);

    const averageRating = ratingStats[0]?.averageRating || 0;
    const totalReviews = ratingStats[0]?.totalReviews || 0;

    // Monthly earnings (last 6 months)
    const monthlyEarnings = await getMonthlyEarnings(providerId, 6);

    // Recent transactions (last 10 FullyPaid bookings)
    const recentTransactions = await Booking.find({
      providerId,
      paymentStatus: 'FullyPaid'
    })
      .sort({ date: -1 })
      .limit(10)
      .populate('serviceId', 'title category')
      .populate('customerId', 'name email')
      .lean();

    // Recent bookings (active: confirmed or in progress)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('[DASHBOARD] Fetching recent bookings for provider:', providerId.toString());
    console.log('[DASHBOARD] Today date:', today);
    
    const upcomingBookings = await Booking.find({
      providerId,
      status: { $in: ['Confirmed', 'InProgress'] }
    })
      .sort({ date: -1, startTime: 1 })
      .limit(5)
      .populate('serviceId', 'title category')
      .populate('customerId', 'name email')
      .lean();
    
    console.log('[DASHBOARD] Upcoming bookings found:', upcomingBookings.length);
    if (upcomingBookings.length > 0) {
      console.log('[DASHBOARD] First booking:', {
        date: upcomingBookings[0].date,
        status: upcomingBookings[0].status,
        service: upcomingBookings[0].serviceId?.title
      });
    }

    // Top services (by view count)
    const topServices = await Service.find({ providerId, isActive: true })
      .sort({ viewCount: -1 })
      .limit(3)
      .lean();

    // Recent reviews for this provider
    const recentReviews = await Review.findByProvider(providerId, 5);

    // Render Saheli dashboard
    res.render('pages/dashboard/saheli', {
      title: 'Provider Dashboard',
      dashboardPage: true,
      role: 'saheli',
      stats: {
        ...stats,
        totalServices,
        activeServices,
        pausedServices,
        averageRating: averageRating.toFixed(1),
        totalReviews
      },
      monthlyEarnings,
      recentTransactions,
      upcomingBookings,
      topServices,
      recentReviews
    });
  } catch (error) {
    console.error('Error rendering Saheli dashboard:', error);
    throw error;
  }
}

/**
 * Render Customer Dashboard
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {String} userId - User ID
 */
async function renderCustomerDashboard(req, res, userId) {
  try {
    const customerId = new mongoose.Types.ObjectId(userId);

    // Aggregate booking stats
    const bookingStats = await Booking.aggregate([
      { 
        $match: { 
          customerId,
          // Exclude Pending bookings that haven't been paid
          // They are failed bookings that should be cleaned up
          $or: [
            { status: { $ne: 'Pending' } }, // Include all non-Pending
            { 
              // Or include Pending only if payment was made (shouldn't happen, but safety check)
              $and: [
                { status: 'Pending' },
                { paymentStatus: { $in: ['AdvancePaid', 'FullyPaid'] } }
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          activeBookings: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Confirmed', 'InProgress']] },
                1,
                0
              ]
            }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          // Services Received = Completed + Active bookings where payment was made
          servicesReceived: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['Confirmed', 'InProgress', 'Completed']] },
                    { $in: ['$paymentStatus', ['AdvancePaid', 'FullyPaid']] }
                  ]
                },
                1,
                0
              ]
            }
          },
          // Total Spent = Only count bookings where payment was actually made
          // Don't count Pending or Cancelled bookings
          totalSpent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'Cancelled'] }, // Not cancelled
                    { $ne: ['$status', 'Pending'] }, // Not pending (failed payment)
                    { $in: ['$paymentStatus', ['AdvancePaid', 'FullyPaid']] } // Payment actually made
                  ]
                },
                {
                  $cond: [
                    { $eq: ['$paymentStatus', 'FullyPaid'] }, 
                    '$totalAmount', // Fully paid = total amount spent
                    '$advancePaid' // AdvancePaid = count advance paid amount
                  ]
                },
                0 // Don't count this booking
              ]
            }
          }
        }
      }
    ]);

    const stats = bookingStats[0] || {
      totalBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      servicesReceived: 0,
      totalSpent: 0
    };

    // Debug logging for customer spending calculation
    console.log('[DASHBOARD] Customer spending stats:', {
      customerId: customerId.toString(),
      totalSpent: stats.totalSpent,
      totalBookings: stats.totalBookings,
      activeBookings: stats.activeBookings,
      completedBookings: stats.completedBookings
    });

    // Pending payments count
    const pendingPaymentsCount = await Booking.countDocuments({
      customerId,
      status: 'Completed',
      paymentStatus: 'AdvancePaid'
    });

    // Debug: Get ALL bookings for this customer to see what's happening
    const allBookings = await Booking.find({ customerId }).select('status paymentStatus totalAmount advancePaid').lean();
    console.log('[DASHBOARD] All customer bookings:', allBookings.map(b => ({
      id: b._id,
      status: b.status,
      paymentStatus: b.paymentStatus,
      totalAmount: b.totalAmount,
      advancePaid: b.advancePaid
    })));

    // Bookings by status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingBookings = await Booking.find({
      customerId,
      status: { $in: ['Confirmed', 'InProgress'] },
      date: { $gte: today }
    })
      .sort({ date: 1, startTime: 1 })
      .populate('serviceId', 'title category images')
      .populate('providerId', 'name email city hasVerificationBadge')
      .lean();

    const completedBookings = await Booking.find({
      customerId,
      status: 'Completed'
    })
      .sort({ date: -1 })
      .limit(10)
      .populate('serviceId', 'title category images')
      .populate('providerId', 'name email city hasVerificationBadge')
      .lean();

    const cancelledBookings = await Booking.find({
      customerId,
      status: 'Cancelled'
    })
      .sort({ date: -1 })
      .limit(10)
      .populate('serviceId', 'title category images')
      .populate('providerId', 'name email city')
      .lean();

    console.log('[DASHBOARD] Bookings by status:', {
      upcoming: upcomingBookings.length,
      completed: completedBookings.length,
      cancelled: cancelledBookings.length
    });

    // Recent payments
    const Payment = require('../models/Payment');
    const recentPayments = await Payment.find({
      customerId,
      status: 'Success'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('serviceId', 'title category')
      .populate('providerId', 'name email')
      .lean();

    // Render Customer dashboard
    res.render('pages/dashboard/customer', {
      title: 'My Dashboard',
      dashboardPage: true,
      role: 'customer',
      stats: {
        ...stats,
        pendingPaymentsCount
      },
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      recentPayments
    });
  } catch (error) {
    console.error('Error rendering Customer dashboard:', error);
    throw error;
  }
}

/**
 * Get monthly earnings for last N months
 * @param {ObjectId} providerId - Provider ID
 * @param {Number} monthsCount - Number of months to retrieve
 * @returns {Array} Monthly earnings data
 */
async function getMonthlyEarnings(providerId, monthsCount = 6) {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const earningsData = await Booking.aggregate([
      {
        $match: {
          providerId,
          paymentStatus: 'FullyPaid',
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          earnings: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Create complete array with all months
    const result = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const dataPoint = earningsData.find(
        (d) => d._id.year === year && d._id.month === month
      );

      result.push({
        month: `${monthNames[month - 1]} ${year}`,
        earnings: dataPoint?.earnings || 0,
        count: dataPoint?.count || 0
      });
    }

    return result;
  } catch (error) {
    console.error('Error getting monthly earnings:', error);
    return [];
  }
}

module.exports = {
  renderDashboard
};
