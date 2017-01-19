CREATE TABLE "buildings" (
	"id" SERIAL PRIMARY KEY,
	"name" TEXT NOT NULL,
	"number" SMALLINT NOT NULL,
	"street" TEXT NOT NULL,
	"total" SMALLINT NOT NULL,
	"hvac" SMALLINT NOT NULL,
	"lights" SMALLINT NOT NULL,
	"plugs" SMALLINT NOT NULL,
	"kitchen" SMALLINT NOT NULL
);

CREATE TABLE "loggers" (
	"id" SERIAL PRIMARY KEY,
	"serial" INTEGER NOT NULL,
	"building" INTEGER REFERENCES "buildings" ("id"),
	"hvac" TEXT DEFAULT '[]',
	"kitchen" TEXT DEFAULT '[]',
	"plugs" TEXT DEFAULT '[]',
	"lights" TEXT DEFAULT '[]',
	"solar" TEXT DEFAULT '[]',
	"ev" TEXT DEFAULT '[]'
);

CREATE TABLE "hobodata" (
	"id" SERIAL PRIMARY KEY,
	"logger" INTEGER REFERENCES "loggers" ("id"),
	"datetime" TIMESTAMP NOT NULL,
	"hvac" numeric(8,2) DEFAULT 0,
	"kitchen" numeric(8,2) DEFAULT 0,
	"plugs" numeric(8,2) DEFAULT 0,
	"lights" numeric(8,2) DEFAULT 0,
	"solar" numeric(8,2) DEFAULT 0,
	"ev" numeric(8,2) DEFAULT 0
);

INSERT INTO "buildings"
("id", "name", "number", "street", "total", "hvac", "kitchen", "plugs", "lights")
VALUES
(1, '215 Sage', 215, 'Sage', 10000, 1, 850, 4000, 5000),
(2, '1590 Tilia', 1590, 'Tilia', 10000, 1, 850, 4000, 5000),
(3, '1605 Tilia', 1605, 'Tilia', 10000, 1, 850, 4000, 5000),
(4, '1715 Tilia', 1715, 'Tilia', 10000, 1, 850, 4000, 5000);

INSERT INTO "loggers"
("id", "serial", "building", "hvac", "kitchen", "plugs", "lights", "solar", "ev")
VALUES
(1, 10459715, 2, '[]', '[6, 7, 8, 11, 12, 13]', '[3, 4, 5, 14, 15]', '[9, 10]', '[2, 16]', '[]');
(2, 10459717, 2, '[5, 6, 7, 8]', '[]', '[2, 3, 4, 9, 10, 11]', '[]', '[12]', '[13, 14, 15, 16]');