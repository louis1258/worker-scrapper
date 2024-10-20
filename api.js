const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// API endpoint for uploading the file
const baseURL = 'http://localhost:9000/api/upload';

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
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5naGlhLmhvdGhhbmgzMTlAZ21haWwuY29tIiwidXNlcklkIjoiNjZmMTkzYmVlNjY3MTI5MzE5ZDkwYjI1IiwiZW1haWwiOiJuZ2hpYS5ob3RoYW5oMzE5QGdtYWlsLmNvbSIsImlhdCI6MTcyOTQ0MTg3OSwiZXhwIjoxNzI5NTI4Mjc5fQ.8kqT-lA7wkcHZJSBunNF5nYbtlwwwF2MNqCF84lou_g`,  // Add your token here if needed
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

// Export the function using CommonJS
module.exports = { upload };
