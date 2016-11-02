CREATE TABLE "log" (
	"id" SERIAL PRIMARY KEY,
	"building" CHAR(4) NOT NULL,
	"datetime" TIMESTAMP NOT NULL,
	"kitchen" numeric(8,2) DEFAULT 0,
	"plugs" numeric(8,2) DEFAULT 0,
	"lights" numeric(8,2) DEFAULT 0,
	"solar" numeric(8,2) DEFAULT 0,
	"ev" numeric(8,2) DEFAULT 0
);
