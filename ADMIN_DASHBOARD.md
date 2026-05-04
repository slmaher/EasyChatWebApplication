# Admin Dashboard Documentation

## Overview

The Admin Dashboard is a comprehensive logging and monito7ring system for the EasyChat application. It tracks application events, errors, user activities, and provides real-time statistics and analytics.

## Features

✅ **Comprehensive Logging**: Captures user actions, API calls, authentication events, and system errors
✅ **Advanced Filtering**: Filter logs by type, severity, date range, and user
✅ **Search**: Full-text search across log messages, emails, and endpoints
✅ **Statistics**: Real-time analytics with visual charts showing error rates, trends, and top errors
✅ **Export**: Download logs as CSV files for external analysis
✅ **Log Management**: Manual deletion of logs and automatic cleanup of old logs
✅ **Role-Based Access**: Only users with admin role can access the dashboard

## Setup Instructions

### 1. Create an Admin User

To promote an existing user to admin, use MongoDB directly or through the API:

```javascript
// Using MongoDB directly
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } },
);
```

Or manually update in your database management tool:

- Set the `role` field to "admin" for the user

### 2. Accessing the Dashboard

1. Log in to your account
2. If you have admin role, you'll see an "Admin" button in the navbar
3. Click "Admin" to access the dashboard

**URL**: `http://localhost:5173/admin` (dev) or `/admin` (production)

## Dashboard Features

### 📋 Logs Tab

#### View Logs

- See all application logs with detailed information
- Each log entry shows:
  - Timestamp
  - Event type
  - Severity level (info, warning, error, critical)
  - Message
  - User information
  - Action buttons

#### Filter Logs

- **By Type**: Login, logout, signup, API errors, server errors, etc.
- **By Severity**: Info, warning, error, critical
- **By Date Range**: Specify start and end dates
- **By User**: Filter logs for specific users

#### Search Logs

- Use the search bar to find logs containing specific keywords
- Searches across:
  - Log messages
  - User emails
  - API endpoints
  - Error details

#### Export Logs

- Download filtered logs as CSV file
- CSV includes: date, type, severity, message, user, email, endpoint, status code, duration
- Useful for reports and external analysis

#### Delete Logs

- Remove individual logs using the "Delete" button
- Logs are permanently removed from database

#### Pagination

- Navigate through large log sets
- View total log count
- Customize items per page

### 📊 Statistics Tab

#### Key Metrics

- **Total Logs**: Number of logs in selected period
- **Errors**: Count of error and critical logs
- **Error Rate**: Percentage of error logs
- **Period**: Time range for statistics

#### Visual Charts

1. **Severity Distribution** (Pie Chart)
   - Shows breakdown of logs by severity level
   - Helps identify if system has more errors than expected

2. **Top Log Types** (Bar Chart)
   - Shows which events are most frequent
   - Useful for understanding application usage patterns

3. **Errors Over Time** (Line Chart)
   - Tracks error trends across the selected period
   - Shows if errors are increasing or decreasing

#### Date Range Selection

- Select predefined periods: Last 7, 30, or 90 days
- Charts update automatically when period changes

#### Top Errors List

- Shows most frequently occurring errors
- Helps identify recurring issues that need attention

### 🛠️ Tools Tab

#### Refresh Data

- Manually reload logs and statistics
- Useful when you want to see latest data

#### Clear Old Logs

- Delete logs older than specified number of days
- Helps manage database size
- **Warning**: Action is permanent
- Prevents database bloat from old historical data

#### Export Logs

- Quick access to download CSV file
- Use current filter settings

#### View Statistics

- Quick link to statistics tab

## Logged Events

### Authentication Events

- `user_signup` - New user registration
- `user_login` - User login attempts
- `user_logout` - User logout
- `auth_failed` - Failed authentication

### User Actions

- `user_deleted` - User account deleted
- `block_user` - User blocked another user
- `unblock_user` - User unblocked another user

### Messaging Events

- `message_sent` - Message sent
- `message_deleted` - Message deleted
- `group_created` - Group created
- `member_added` - Member added to group
- `member_removed` - Member removed from group

### System Events

- `api_error` - API endpoint error
- `database_error` - Database operation error
- `validation_error` - Input validation failed
- `permission_denied` - Unauthorized access attempt
- `server_error` - Unhandled server error
- `security_event` - Security-related event

### Log Fields

Each log entry contains:

- **type**: Event type (see above)
- **severity**: info, warning, error, or critical
- **message**: Human-readable description
- **userId**: ID of the user who triggered the event
- **userEmail**: Email address of the user
- **action**: What action was performed
- **endpoint**: API endpoint involved
- **statusCode**: HTTP status code
- **ipAddress**: Client IP address
- **userAgent**: Browser/client information
- **duration**: Time taken for API call (milliseconds)
- **errorStack**: Full error stack trace (for errors)
- **metadata**: Additional context-specific data
- **timestamp**: When the event occurred

## Usage Examples

### Finding Failed Login Attempts

1. Go to Logs tab
2. Filter by Type = "auth_failed"
3. Optional: Add date range to narrow results
4. Review failed login attempts

### Analyzing API Performance

1. Go to Statistics tab
2. Select desired time period
3. View charts showing error trends
4. Export to CSV for detailed analysis

### Cleaning Up Old Data

1. Go to Tools tab
2. Click "Clear Old Logs"
3. Enter number of days (e.g., 90)
4. Click "Delete" to remove logs older than 90 days

### Investigating Errors

1. Go to Statistics tab
2. Check "Top Errors" list
3. Identify most common errors
4. Go to Logs tab and search for error messages
5. Review error stack traces

## Best Practices

1. **Regular Monitoring**: Check dashboard weekly for error spikes
2. **Cleanup Routine**: Clear logs older than 90 days monthly
3. **Alert Investigation**: Address "critical" severity logs immediately
4. **Export Reports**: Export weekly/monthly logs for records
5. **User Activity**: Monitor suspicious login patterns from Logs tab

## Troubleshooting

### Can't Access Admin Dashboard?

- Verify your user has `role: "admin"` in database
- Check that you're logged in
- Clear browser cache and try again

### No Logs Appearing?

- Check if application is generating events (try login/logout)
- Wait a few seconds for logs to be written to database
- Try refreshing the page or clicking "Refresh Data" button

### Statistics Not Loading?

- Ensure there are logs in the database
- Try narrowing the date range
- Check browser console for errors

### Export Not Working?

- Disable browser pop-up blocker
- Check internet connection
- Try exporting with fewer filters

## API Endpoints

All endpoints require admin role and authentication:

```
GET /api/logs - Get logs with filters and pagination
GET /api/logs/search?query=term - Search logs
GET /api/logs/stats?days=30 - Get statistics
GET /api/logs/export - Download as CSV
DELETE /api/logs/:id - Delete specific log
POST /api/logs/clear-old - Delete old logs
```

### Query Parameters for GET /api/logs

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `type`: Filter by event type
- `severity`: Filter by severity level
- `startDate`: Filter by start date (ISO format)
- `endDate`: Filter by end date (ISO format)
- `userId`: Filter by user ID

## Database Considerations

### Indexes

Logs are indexed on:

- `createdAt` - For sorting and date range queries
- `type` - For filtering by event type
- `severity` - For severity level filtering
- `userId` - For finding user-specific logs

### Storage

- Each log entry is relatively small (~1KB average)
- 10,000 logs = ~10MB
- Plan for monthly cleanup to manage database size

### Performance

- Pagination is recommended for large datasets
- Use date filters to limit result sets
- Consider archiving very old logs periodically

## Security

- ✅ Admin role required for all access
- ✅ Logs include IP addresses for security investigation
- ✅ Failed login attempts are logged
- ✅ User actions are tied to user IDs
- ✅ All endpoint changes are logged

## Future Enhancements

Potential improvements:

- Real-time log streaming via WebSocket
- Email alerts for critical errors
- Log retention policies
- Advanced search with regex support
- Custom dashboards and reports
- Log aggregation and correlation
- Performance metrics dashboard
- User behavior analytics
