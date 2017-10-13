'use strict';

const bodyParser = require('body-parser');

module.exports = function(app) {
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/api/codes', function (req, res) {

    if (req.headers['authorization'] !== "Bearer some bs") {
      return res.status(401).send('Unauthorized');
    }

    // {"data":[{"id":"1","type":"codes","attributes":{"description":"Bitcoin keeps hitting record highs"}}]}
    return res.status(200).send({
      "data": [{
        "type": "codes",
        "id": "1",
        "attributes": {
          "description": "Bitcoin keeps hitting record highs"
        },
      },{
        "type": "codes",
        "id": "2",
        "attributes": {
          "description": "Jamie Dimon doesn’t want to talk about it"
        }
      }]
    });
  });

  app.post('/token', function(req, res) {
    if (req.body.username == 'login' && req.body.password == 'password') {
      res.send({ access_token: "some bs" });
    } else {
      res.status(400).send({ error: "invalid_grant" });
    }
  });

  // {"data":[{"id":"1","type":"users","attributes":{"email":"test@example.com"}}]}
  app.get('/api/users', function (req, res) {
    return res.status(200).send({
      "data": [{
        "type": "users",
        "id": "1",
        "attributes": {
          "email": "test@example.com"
        },
      },{
        "type": "users",
        "id": "2",
        "attributes": {
          "email": "demo@example.com"
        }
      },{
        "type": "users",
        "id": "3",
        "attributes": {
          "email": "lugatex@yahoo.com"
        }
      }]
    });
  });
};
