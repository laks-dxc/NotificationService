//const sql = require("mssql");



exports.handler = async function (event, context) {

    var sql = require("mssql");

    sql.close();

    // config for your database
    //var config = {
    //    user: process.env.SQL_USER,
    //    password: process.env.SQL_PASSWORD,
    //    server: process.env.SQL_SERVER ,

    //    database:"rdsadmin",
    //    //database: process.env.SQL_DATABASE
    //};

    var config = {
        user: 'root',
        password: 'Laks5347',
        server: 'mydb.cszfjj4w4sno.us-east-2.rds.amazonaws.com',

        database: "rdsadmin",
        //database: process.env.SQL_DATABASE
    };


    //'mssql://' + process.env.SQL_USER + ':' + process.env.SQL_PASSWORD + '@' + process.env.SQL_SERVER 

    // connect to your database

    console.log('config', config);

    sql.connect(config, function (err) {

        if (err)
            console.log('error', err);
        else
            console.log("connected");
        return err;
    });




    var request = new sql.Request();

    request.query("select top 1 * from db_backups", function (err, recordset) {
        if (!err)
            return recordset;
        else
            return err;
    });

    //event.Records.forEach(record => {
    //    const { body } = record;
    //    console.log(body["hi"]);
    //});
    //return { 'message_received_count': process.env.PORT };
}


var sql = require("mssql");

//sql.close();

// config for your database
//var config = {
//    user: process.env.SQL_USER,
//    password: process.env.SQL_PASSWORD,
//    server: process.env.SQL_SERVER ,

//    database:"rdsadmin",
//    //database: process.env.SQL_DATABASE
//};

var config = {
    user: 'root',
    password: 'Laks5347',
    server: 'mydb.cszfjj4w4sno.us-east-2.rds.amazonaws.com',

    database: "mydatabase",
    //database: process.env.SQL_DATABASE
};


//'mssql://' + process.env.SQL_USER + ':' + process.env.SQL_PASSWORD + '@' + process.env.SQL_SERVER 

// connect to your database

//console.log('config', config);

sql.connect(config, function (err) {

    if (err)
        console.log('error', err);
    else {

        console.log("connected");

        var request = new sql.Request();

        request.query("select fld1 from mytable", function (err, rs) {
            if (!err)
                console.log(rs.recordsets);
            else
                console.log(err);
        });
    }
    //return err;
});


