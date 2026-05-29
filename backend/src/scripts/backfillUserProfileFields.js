require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const result = await mongoose.connection.collection('users').updateMany(
    {},
    [
      {
        $set: {
          phone: { $ifNull: ['$phone', ''] },
          department: {
            $ifNull: [
              '$department',
              {
                $switch: {
                  branches: [
                    { case: { $eq: ['$vai_tro', 'admin'] }, then: 'System Administration' },
                    { case: { $eq: ['$vai_tro', 'manager'] }, then: 'Management' },
                  ],
                  default: 'Production',
                },
              },
            ],
          },
          location: { $ifNull: ['$location', 'Ho Chi Minh City'] },
          timezone: { $ifNull: ['$timezone', 'GMT+7'] },
          bio: { $ifNull: ['$bio', ''] },
          avatar: { $ifNull: ['$avatar', ''] },
          two_factor_enabled: { $ifNull: ['$two_factor_enabled', false] },
          updatedAt: '$$NOW',
        },
      },
    ],
  );

  console.log(JSON.stringify({ matched: result.matchedCount, modified: result.modifiedCount }, null, 2));
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
