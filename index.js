const browserObject = require('./browser');
const scraperController = require('./pageController');

//Start the browser and create a browser instance
let browserInstance = browserObject.startBrowser();

// Pass the browser instance to the scraper controller
scraperController(browserInstance)
// const amqp = require('amqplib');

// async function sendToQueue(storyId) {
//   const connection = await amqp.connect("amqp://localhost"); // Thay đổi IP nếu cần
//   console.info("Kết nối tới RabbitMQ thành công");

//   const channel = await connection.createChannel();
//   const queue = 'crawlQueue'; // Tên hàng đợi

//   await channel.assertQueue(queue, { durable: true }); // Tạo hàng đợi nếu chưa có
  
//   // Gửi công việc (truyện) vào hàng đợi
//   const message = { storyId };
//   channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

//   console.log(`Đã gửi truyện ${storyId} vào hàng đợi.`);
//   await channel.close();
//   await connection.close();
// }

// // Thêm 15 ID truyện vào hàng đợi
// async function sendMultipleStories() {
//   for (let i = 1; i <= 15; i++) {
//     await sendToQueue(i); // Gửi ID truyện từ 1 đến 15
//   }
// }

// sendMultipleStories().catch(console.error);

// const amqp = require('amqplib');

// async function startWorker() {
//   const connection = await amqp.connect("amqp://localhost"); // Thay đổi IP nếu cần
//   const channel = await connection.createChannel();
//   const queue = 'crawlQueue'; // Tên hàng đợi

//   await channel.assertQueue(queue, { durable: true }); // Tạo hàng đợi nếu chưa có
//   channel.prefetch(1); // Giới hạn số lượng message được gửi đến worker tại một thời điểm

//   console.log("Waiting for messages in %s. To exit press CTRL+C", queue);

//   channel.consume(queue, (msg) => {
//     const message = JSON.parse(msg.content.toString());
//     console.log(`Đã nhận truyện ID: ${message.storyId}`);

//     // Xác nhận rằng message đã được xử lý
//     channel.ack(msg);
//   }, { noAck: false }); // Không tự động xác nhận
// }

// startWorker().catch(console.error);

