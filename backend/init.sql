CREATE TABLE universe (
    time TIMESTAMPTZ NOT NULL,
    event TEXT,
    energy DOUBLE PRECISION
);
SELECT create_hypertable('universe', 'time');

-- The Big Bang: t=0, infinite energy
INSERT INTO universe (time, event, energy)
VALUES ('1970-01-01 00:00:00+00', 'Big Bang', 'Infinity');
