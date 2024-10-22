const browserObject = require('./browser');
const scraperController = require('./pageController');
let browserInstance = browserObject.startBrowser();
scraperController(browserInstance)


/////////////////////////// test api



const { createComic, upload } = require("./api");
const createSlug = require("./utils/slug")
const comic = {
    coverImage: 'https://i.hinhhinh.com/ebook/190x247/sentouin-hakenshimasu_1526349704.jpg?gt=hdfgdfg&mobile=2',
    title: 'Sentouin, Hakenshimasu!',
    genres: [ 'Action', 'Fantasy', 'Supernatural', 'Ecchi' ],
    description: 'Lấy chinh phục thế giới làm mục đích, hơn thế nữa trong vai trò là một chiến binh tiên phong được phái cử tới địa điểm chiến lược, Chiến binh số 6 lại làm các nhà lãnh đạo cuả tổ chức bí mật Kisaragi đau đầu bởi những hành động của mình. Tỷ như chuyện thay đổi cách gọi lễ tế thần tại địa điểm chiến lược thành “lễ hội XXX”, và cơ số những phát ngôn nhảm. Xa hơn nữa là chuyện biết rõ rằng đánh giá của mình thấp, mà cứ sống chết đòi tăng tiền thưởng. Gần đây, lại có lời đồn rằng, hiện nay, có một chủng loài nghĩ rằng mình là con người, muốn tiêu diệt tất cả những kẻ cùng chung đường, lấy danh nghĩa quân đoàn ma vương. “ Một núi không thế có hai hổ, Thế giới không cần hai tổ chức độc ác!” những vũ khí hiện đại nhất được đưa ra, Chiến tranh xâm chiếm thế giới mới cứ thế bắt đầu!!',
    status :"Đang ra",
    genres:["66f193d8e667129319d90b31","66f193d8e667129319d90b31","66f193d8e667129319d90b31"],
    author:"Đang cập nhật"
}

comic.slug = createSlug(comic.title)
async function main() {
    try {
        const result = await createComic(comic);
        console.log('Comic created:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}
main();





////////////////////////////////////Queue/////////////////////////////////////////////////////




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

