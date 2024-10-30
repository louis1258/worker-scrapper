const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// API endpoint for uploading the file
const baseURL = 'http://77.237.236.3:9000/api/upload';

const upload = (image) => {
    const filePath = path.join(__dirname, image);  // Path to the image file

    // Create a new FormData instance
    console.log(filePath);
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    // Axios config with headers
    const config = {
        headers: {
            'Content-Type': `multipart/form-data`,  // Axios handles the boundary automatically
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5naGlhLmhvdGhhbmgzMTlAZ21haWwuY29tIiwidXNlcklkIjoiNjZmMTkzYmVlNjY3MTI5MzE5ZDkwYjI1IiwiZW1haWwiOiJuZ2hpYS5ob3RoYW5oMzE5QGdtYWlsLmNvbSIsImlhdCI6MTczMDMwNzM2NSwiZXhwIjoxNzMwMzkzNzY1fQ.RBmGtu579G6wHgMFr4LDF1ry3lK-mJ0XnPOBIG4nTzc`,  // Add your token here if needed
            ...formData.getHeaders(),  // Automatically set the multipart headers
        },
        timeout: 60000
    };

    // Perform the image upload
    return axios.post(baseURL, formData, config)
        .then(response => {
            console.log('Image uploaded successfully:', response.data);

            // Delete the file after successful upload
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting the file:', err);
                } else {
                    console.log(`File ${filePath} deleted successfully.`);
                }
            });

            return response.data;  // Return the response data (e.g., URL of the uploaded image)
        })
        .catch(error => {
            console.error('Error uploading image:', error);
            throw error;  // Rethrow the error to handle it in the calling code
        });
};

const COMIC_URL = 'http://77.237.236.3:9000/api/comics';
const createComic = (comic) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5naGlhLmhvdGhhbmgzMTlAZ21haWwuY29tIiwidXNlcklkIjoiNjZmMTkzYmVlNjY3MTI5MzE5ZDkwYjI1IiwiZW1haWwiOiJuZ2hpYS5ob3RoYW5oMzE5QGdtYWlsLmNvbSIsImlhdCI6MTczMDIxMzc4OSwiZXhwIjoxNzMwMzAwMTg5fQ.nxEysIpsXVLxzKHmz5KfTrjDuvve2C32q8RGnwZ1xqw`,  // Add your token here if needed
        },
        timeout: 60000
    };

    return axios.post(COMIC_URL, comic, config)
        .then(response => {
            return response.data;  // Trả về data từ response
        })
        .catch(error => {
            console.error('Error uploading comic:', error);
            throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
        });

}


const CHAPTER_URL = 'http://77.237.236.3:9000/api/chapters';
const createChapter = (chapter) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5naGlhLmhvdGhhbmgzMTlAZ21haWwuY29tIiwidXNlcklkIjoiNjZmMTkzYmVlNjY3MTI5MzE5ZDkwYjI1IiwiZW1haWwiOiJuZ2hpYS5ob3RoYW5oMzE5QGdtYWlsLmNvbSIsImlhdCI6MTczMDIxMzc4OSwiZXhwIjoxNzMwMzAwMTg5fQ.nxEysIpsXVLxzKHmz5KfTrjDuvve2C32q8RGnwZ1xqw`
        },
        timeout: 60000
    }
    return axios.post(CHAPTER_URL, chapter, config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error uploading comic:', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}



const COMICTYPE_URL = 'http://77.237.236.3:9000/api/comic-types/findName';
const createComicType = (type) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5naGlhLmhvdGhhbmgzMTlAZ21haWwuY29tIiwidXNlcklkIjoiNjZmMTkzYmVlNjY3MTI5MzE5ZDkwYjI1IiwiZW1haWwiOiJuZ2hpYS5ob3RoYW5oMzE5QGdtYWlsLmNvbSIsImlhdCI6MTczMDIxMzc4OSwiZXhwIjoxNzMwMzAwMTg5fQ.nxEysIpsXVLxzKHmz5KfTrjDuvve2C32q8RGnwZ1xqw`
        },
        timeout: 60000
    }
    return axios.post(COMICTYPE_URL, type, config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error create comic type :', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}
// Export the function using CommonJS
module.exports = { upload, createComic,createChapter, createComicType};
