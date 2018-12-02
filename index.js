const Sequelize = require('sequelize');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const geolib = require('geolib');

const dbOptions = {
    host: 'localhost',
    dialect: 'mysql',
    define: {
      timestamps: true,
      paranoid: true
    }
  };
  const sequelize = new Sequelize('tracking','root','5591',dbOptions);

  let fleets = sequelize.define('fleets', {
      id: {
          primaryKey: true,
          type: Sequelize.INTEGER,
          autoIncrement: true
      },
      name: Sequelize.STRING
  });

  let vehicles = sequelize.define('vehicles', {
    id: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
    },
    name: Sequelize.STRING,
    fleetId: {
        type: Sequelize.INTEGER,
        references:{
            model: fleets,
            key: 'id'
        }
    }
  })
  
  let motions = sequelize.define('motions', {
    id: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
    },
    latitude: Sequelize.DOUBLE,
    longitude: Sequelize.DOUBLE,
    time: Sequelize.TIME,
    vehicleId: {
        type: Sequelize.INTEGER,
        references:{
            model: vehicles,
            key: 'id'
        }
    }
  },{
        getterMethods: {
            latLng(){
                return {
                    latitude: this.latitude,
                    longitude: this.longitude
                }
            }
        }
    }
)

sequelize.sync();

app.use(bodyParser.json());

const fleetsRoute = express.Router();
const vehiclesRoute = express.Router();
const motionsRoute = express.Router();

app.use('/api/fleets', fleetsRoute);
app.use('/api/vehicles', vehiclesRoute);
app.use('/api/motions', motionsRoute);

const fleet = {
    readall: (request,responce) => {
        fleets.findAll({raw: true}).then(result => {
            responce.json({result});
        }).catch(error => {
            responce.json({error:error.message})
        })
    },
    
    read: (request,responce) => {
        fleets.findByPk(request.query.id).then(fleet => {
            if (fleet){
                responce.json({fleet});
            }
            else{
                responce.statusCode = 400;
                responce.json({error: 'Object was not found'})
            }
        }).catch(error => {
            responce.json({error: error.message});
        })
    },
    
    create: (request,responce) => {
        let fleet = {
            name: request.body.name
        };
        fleets.create(fleet).then(result => {
            responce.json({result});
        }).catch(error => {
            responce.json({error: error.message});
        });
    },
    
    update: (request,responce) => {
        fleets.update({
            name: request.body.name
        },{
            where: {
                id: request.body.id,
                deletedAt: null
            }
        }).then(result => {
            if (result[0] == 0){
                responce.statusCode = 400;
                responce.json({error: 'Object was not found'})
            }
            else{
                fleets.findByPk(request.body.id).then(fleet => {
                    responce.json({object: fleet});
                });
            }
        })
    },

    delete: (request, responce) => {
        fleets.findByPk(request.body.id).then(resultFleet => {
            if (resultFleet){
                fleets.destroy({
                    where: {
                        id: request.body.id
                    }
                }).then(result => {
                    responce.json({result: resultFleet})
                }).catch(error => {
                    responce.json({error: error.message})
                })
            }
            else{
                responce.statusCode = 400;
                responce.json({error: 'Object was not found'});
            }
        })
    }
}

const vehicle = {
    readall: (request,responce) => {
        vehicles.findAll({raw: true}, {
            where: {
                fleetId: request.body.fleetId
            }
        }).then(result => {
            responce.json({result});
        }).catch(error => {
            responce.json({error:error.message})
        })
    },
    
    read: (request,responce) => {
        vehicles.findByPk(request.query.id).then(vehicle => {
           if (vehicle){
                responce.json({vehicle});
           }
           else{
            responce.statusCode = 400;
            responce.json({error: 'Object was not found'})
           }
        }).catch(error => {
            responce.json({error: error.message});
        })
    },
    
    create: (request,responce) => {
        let vehicle = {
            name: request.body.name,
            fleetId: request.body.fleetId
        };
        vehicles.create(vehicle).then(result => {
            responce.json({result});
        }).catch(error => {
            responce.json({error: error.message});
        });
    },
    
    update: (request,responce) => {
        vehicles.update({
            name: request.body.name
        },{
            where: {
                id: request.body.id,
                deletedAt: null
            }
        }).then(result => {
            if (result[0] == 0){
                responce.statusCode = 400;
                responce.json({error: 'Object was not found'})
            }
            else{
                vehicles.findByPk(request.body.id).then(vehicle => {
                    responce.json({object: vehicle});
                });
            }
        })
    },

    delete: (request, responce) => {
        vehicles.findByPk(request.body.id).then(resultVehicle => {
            if (resultVehicle){
                vehicles.destroy({
                    where: {
                        id: request.body.id
                    }
                }).then(result => {
                    responce.json({result: resultFleet})
                }).catch(error => {
                    responce.json({error: error.message})
                })
            }
            else{
                responce.statusCode = 400;
                responce.json({error: 'Object was not found'});
            }
        })
    }
};

fleetsRoute.get('/readall', fleet.readall);
fleetsRoute.get('/read', validId, fleet.read);
fleetsRoute.post('/create', fleet.create);
fleetsRoute.post('/update', validId, validName, fleet.update);
fleetsRoute.post('/delete', validId, fleet.delete);

vehiclesRoute.get('/readall', validFleetId, vehicle.readall);
vehiclesRoute.get('/read', validId, vehicle.read);
vehiclesRoute.post('/create', vehicle.create);
vehiclesRoute.post('/update', vehicle.update);
vehiclesRoute.post('/delete', validId, vehicle.delete);
vehiclesRoute.get('/milage', validId, getDistance, (request, responce) =>{
    responce.json({distance: request.distance})
})

function getDistance(request,responce,next){
    motions.findAll({
        where: {
            vehicleId: request.query.id
        }
    }).then(result => {
        if (result.length > 0){
            let distance = 0;
            if (result.length != 1){
                for (let i = 0; i < result.length - 1; i++){
                    distance += geolib.getDistance(result[i]["latLng"], result[i+1]["latLng"]);
                }
            }
            request.distance = distance;    
            next();
        }
        else{
            responce.statusCode = 400;
            responce.json({error: 'Object was not found'})
        }
    })
}

motionsRoute.post('/create', (request,responce) => {
    let date = new Date();
    let motion = {
        latitude: request.body.latitude,
        longitude: request.body.longitude,
        time: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
        vehicleId: request.body.vehicleId
    }
    motions.create(motion).then(result => {
        responce.json(result);
    })
})

function validId(request,responce,next){
    if (request.body.id || request.body.id < 0){
        responce.statusCode = 400;
        responce.json({error: 'Id uncorrect'})
    }
    else{
        next();
    }
}

function validName(request,responce,next){
    if (request.body.name || request.body.name == name){
        responce.statusCode = 400;
        responce.json({error: 'Id uncorrect'})
    }
    else{
        next();
    }
}

function validFleetId(request,responce,next){
    if (request.body.fleetId || request.body.fleetId < 0){
        responce.statusCode = 400;
        responce.json({error: 'Id uncorrect'})
    }
    else{
        next();
    }
}

app.listen(3000, () => {
    console.log(`Project was started at ${Date.now()}`)
})