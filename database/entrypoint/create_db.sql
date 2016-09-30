\connect feed;
/*

	Input after being processed from HOBOLogger
	The data in these tables are aggregates of the loggers
	There may be multiple loggers in the building which are processed and used together
	to form a single column

*/

CREATE TABLE "log" (
	"id" SERIAL PRIMARY KEY,
	"building" CHAR(4) NOT NULL,
	"datetime" TIMESTAMP NOT NULL,
	"kitchen" REAL DEFAULT 0,
	"plugs" REAL DEFAULT 0,
	"lights" REAL DEFAULT 0,
	"solar" REAL DEFAULT 0,
	"ev" REAL DEFAULT 0
);


-- CREATE TABLE hourly_goal(
-- 	weekof timestamp,
-- 	goal real
-- );


-- CREATE TABLE daily_goal(
-- 	weekof timestamp,
-- 	goal real
-- );
