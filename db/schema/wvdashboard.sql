CREATE TABLE "buildings" (
	"id" SERIAL PRIMARY KEY,
	"name" TEXT NOT NULL,
	"number" SMALLINT NOT NULL,
	"street" TEXT NOT NULL,

	"ev" BOOLEAN NOT NULL,
	"lab" BOOLEAN NOT NULL,

	"zne_total" SMALLINT NOT NULL,
	"zne_hvac" SMALLINT NOT NULL,
	"zne_lights" SMALLINT NOT NULL,
	"zne_plugs" SMALLINT NOT NULL,
	"zne_kitchen" SMALLINT NOT NULL
);

CREATE TABLE "loggers" (
	"id" SERIAL PRIMARY KEY,
	"export" TEXT NOT NULL,
	"building" INTEGER REFERENCES "buildings" ("id"),
	"hvac" TEXT DEFAULT '[]',
	"kitchen" TEXT DEFAULT '[]',
	"plugs" TEXT DEFAULT '[]',
	"lights" TEXT DEFAULT '[]',
	"solar" TEXT DEFAULT '[]',
	"ev" TEXT DEFAULT '[]',
	"lab" TEXT DEFAULT '[]'
);

CREATE TABLE "hobodata" (
	"id" SERIAL PRIMARY KEY,
	"logger" INTEGER REFERENCES "loggers" ("id"),
	"datetime" TIMESTAMP NOT NULL,
	"hvac" numeric(8,2),
	"kitchen" numeric(8,2),
	"plugs" numeric(8,2),
	"lights" numeric(8,2),
	"solar" numeric(8,2),
	"ev" numeric(8,2),
	"lab" numeric(8,2)
);

INSERT INTO "buildings"
("id", "name", "number", "street", "ev", "lab", "zne_total", "zne_hvac", "zne_kitchen", "zne_plugs", "zne_lights")
VALUES
(1, '215 Sage', 215, 'Sage', FALSE, TRUE, 20000, 8000, 850, 4000, 5000),
(2, '1590 Tilia', 1590, 'Tilia', TRUE, FALSE,  20000, 8000, 850, 4000, 5000),
(3, '1605 Tilia', 1605, 'Tilia', TRUE, FALSE,  20000, 8000, 850, 4000, 5000),
(4, '1715 Tilia', 1715, 'Tilia', FALSE, FALSE,  20000, 8000, 850, 4000, 5000);

INSERT INTO "loggers"
("export", "building", "hvac", "kitchen", "plugs", "lights", "solar", "ev", "lab")
VALUES
('215_Last_30_Days', 1, '[6,11,19,20,21,23]', '[15,16,17]', '[5,7,8,9,10,12,26,27,28]', '[4,22,24,25]', '[1,14,18]', '[]', '[]'),

('1590_Last_30_Days', 2, '[22,23,24,25]', '[2,3,4,5,6,7]', '[10,11,12,13,14,26,27,28,29,30,31]', '[8,9]', '[15,16,32]', '[18,19,20,21]', '[]'),

('1605_Last_30_Days', 3, '[16,19,20,22,24,27]', '[1,4,5,6,9,13]', '[2,7,10,18,21,23,25,26,28,29]', '[12,14,15]', '[3,11,30]', '[8,17]', '[]'),

('1715_Last_30_Days', 4, '[6,19,20,21,22,23,24,25]', '[4,9,11,12,13,15,26]', '[5,7,10,17,18,27,28,29,30]', '[1,3,14]', '[2,8,16]', '[]', '[]');