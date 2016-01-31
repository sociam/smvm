#!/bin/sh
mongod --replSet emac --dbpath ${HOME}/mongo-data &
# sleep 5
# echo 'rs.initiate({_id: "emac", members: [{_id: 0, host: "127.0.0.1:12345"}]})' | mongo 
