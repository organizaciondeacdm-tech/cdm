const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./database');
const EnvironmentConfig = require('../models/EnvironmentConfig');
const { ALLOWED_EXACT_KEYS } = require('./envKeys');
const { buildLookupKey } = require('../utils/accessControlCrypto');

const seedRuntimeEnv = async () => {
    try {
        await connectDB();
        console.log('🌱 Obteniendo variables de entorno desde el sistema/.env...');

        const DEFAULT_ENV_VALUES = {
            "MONGO_URI": "aclv1.TxUyKkSZtrKvOsr5.7TTqd0BSq5jgn9yx2F77Xw==.mQMQ1L0ql26HrXtwvSgrqGHmUiGfFeAKiskfvGwjimh4Z21TnMmskeoXkFFD4vwZC43hpklzysfPzqa7VTe0",
            "NODE_ENV": "aclv1.TxUyKkSZtrKvOsr5.7TTqd0BSq5jgn9yx2F77Xw==.mQMQ1L0ql26HrXtwvSgrqGHmUiGfFeAKiskfvGwjimh4Z21TnMmskeoXkFFD4vwZC43hpklzysfPzqa7VTe0",
            "PORT": "aclv1.fP9FemV38ppG1vRX.e4lxXYCEoOZ8LVvwb6aUmA==.RLI32CRHmsuFl2SE7qiP8HuVFqP3APbFa3JfdtXmJPxaPbP9OVNrHGvjldrm8hUg8yyj9pZqKAg=",
            "CORS_ORIGIN": "aclv1.e49s+3g+J/4Yvg9G.1VF4meNcI4qVWtdERzjSow==.wp3T4IaVCYnvHbqUFtjelerOzzRGPrT3m5o1e3GutZnnlXtZu9Do2hduAqCGgYyrSyLTPZtQ6HIHc2W3qp39BP9u/1qRlRthHeul4IUsgtMUMWy/EONVB2nPOBdeF4U=",
            "BCRYPT_ROUNDS": "aclv1.q1J1tMZujkRdE033.BX/+uQNLoC42LrpcC0QnKg==.+AAwFXV6zEoIvU/VVOXtRv8I13ZlUmCj/m0YpoA7eywIBPEaZTD39V/dHjhM5Xi7y/Yfc5oG",
            "JWT_SECRET": "aclv1.PxP3BZuvig7YWLSb./CXyBYgSatJTENih7aFixw==.FUkd3qO9FheGZciVIrooZRDnUswzblDiyCFimHwjSog9xaaIvS48Cv2pekWsvbPyfIVZcA5GjDBrk2lbuK2/w4+VeQbNJiyVZLmhJA==",
            "JWT_REFRESH_SECRET": "aclv1.LvJ525zVnQz6Uc44.gwUEr6fGO01TjLxRV5vieg==.FV1UT/Tk6M6KSlmPBNcatplPbRCicqVwWfGSJW2waiO89PcaZE6ma/fhEPTrCtHSOj2WDuZkfH85gEt+eLjvhndOjFEB36jkwAoX9fg6ir9W7C6W",
            "JWT_EXPIRE": "aclv1.g3L8lkr865MJ1f3N.h8Qpafvg3+I7//zSBv6jiQ==.QDbSkI7rQj/rH0OwqmX1oJ89f1ZNlONwHc5djeoMGsOCxHkmVNz5DJiKe6KareyTcQ68jdSE",
            "JWT_REFRESH_EXPIRE": "aclv1.MZwjr9Ns1Nv9Hzir./8rDZKQ1Ime8sesHIs5Gwg==.RlntrUyOu+uhdz44GpMfRhjR+xvPlF9+jpn2D6PD42jLqFFfRee/5hvB+mlboXmbdV76ggNG",
            "JWT_EXPIRE_MINUTES": "aclv1.2NW8GZurB1ce9Spm.wbIqeDlebRdXl5h5sCgaLQ==.+ReM5UhS7FTL/P+MEOv34BJxFoMM6jIbQbfp+Mo8Y2NFMV5lYCClZYXcmK+9SrU1mTYLadWk",
            "JWT_REFRESH_EXPIRE_DAYS": "aclv1.fOsvOweu7TtPUTPJ.GCCWaxFPnca0fg72U9NPNA==.ZiAfaCihATK/qLR/zy9gCvrzewm3xI7Tdsl4kwdk/0b548Eg5iVjR8r4hQ1uFmSdG0YWDzs=",
            "MAX_LOGIN_ATTEMPTS": "aclv1.rwFiXFVMKV9sWBE2.TfQZ8UIYGNmRe/p32yWguw==.riWV05Xjf58H/Be08tI3kM9ccVWvMM82t3H6Z+lMoo768SY3MDii2znLXqBLMUSnA3Avmu4=",
            "LOGIN_LOCK_BASE_MINUTES": "aclv1.yqDJ+ozdl8yrkRAA.4pu61Stg3apWm4uauqj06Q==.5tK8zaXM9oPoefHdCnRoZhDPdwLTqmpN5lVGAJ4QcHb82ApRexvWiur7fMG8xHzSlm88/vMg",
            "LOGIN_LOCK_MAX_MINUTES": "aclv1.+jww4yxju0/MhhT7.sSsFNpQo3MGba7B1TT9C9Q==.kVwS5xYj3GeiJanqTVGb8FSoYvkAOp5v4qJ4uSPWHROvlalSjL9lwxee64/inMmZaK97Vvkc",
            "LOGIN_RESPONSE_DELAY_MS": "aclv1.Vzk4xKzFziSOfklT.c/fRCyUiVibXqnHN2JtOaQ==.fkqAwqoqIF8VB0IEYNjqMIPJfAw92xTStno9ZFdLxO3ij7xkfeTkfZZJ1kiAoFuXciltKK15Ng==",
            "LOGIN_RATE_LIMIT_WINDOW_MINUTES": "aclv1.4sze+REeoHur7P0C.NlVEwp4QZa2HejeZxUNnhQ==.dvUTZJ9GEgfbWWrEf7omdRgza3Biw7O76UA6yhLdDjomXhrpxpZmEAzLJTTq10FuTnsvWNBM",
            "LOGIN_RATE_LIMIT_MAX": "aclv1.tvHL1uO/0/oFmjFD.tUnfz3cyrSbCrjh6mPxOng==.ORry+D+AOW05gf+jUWFl4Ny/F+bLpS98U0sQhDagqx6Ta5KtmOcnIHVOWAvtcq+48nWjbjWx",
            "RATE_LIMIT_WINDOW": "aclv1.QvaxAyc32q5J9Ucl.ngYRfIf6BFIPLAN/kEBSyA==.GhoK30IyyOHPmL6wOAD64vTi/5/VAUUgVtpLnWS9sBsuSFQeeQUunuFRshg3qWhorirtBDJSHdFZ1A==",
            "RATE_LIMIT_MAX": "aclv1.1gBet4RNmh204aln.WDGeIndcu0S98mgzLagwjg==.BOjsn1CkVnUf0XFVTs0EDSc0bwwKmL3LWCc/ZV+Q6Hnb/wLBx1zAvdJizqoZoVZR6UivltLNhw==",
            "EMAIL_HOST": "aclv1.eu5PGAfapmSe9/5a.5htW8ejVKcGahEy9ylGe8Q==.bNRaBoYmuvZrtyJy2f241U9nzVeoiWaQ1pDSjtFoez7FY3zdr9WQCCz3KnhHETVMFjYjtznbn566B1DyqnOzM6AdQhw=",
            "EMAIL_PORT": "aclv1.QulKNZmzNeo3m94G.CR70teWdFL5cHh/8a++HXA==.q26MZ8vWQdZQHHpOQCfiMA6SFDpJfoQrrleDfKrbwLEeTOkP6OsIwsfohB19ZBpNaK3RYQoT0OU=",
            "EMAIL_USER": "aclv1.Bo+JtBra9CfG0Dh6.y9Fd/MMmr8oc+npI77nIaA==.AVE2SwPTUEMUO4CBbIWEHa2vUbBNIgmcsvK+JbLhGnzgseS5a6wNgqo1ySmtIflgQvPRsZiA/QFMBS0Asw==",
            "EMAIL_PASS": "aclv1.ChmKt7fTEECtSlwW.lBm1Iz/Aq2sZov/8Mh5hTw==.iddf522zF1UR0FZwQWkkDFbGKGsp9tB2rlkVtJUGxeLlZAF+McoyL9bsbr2zuS8A96pkMOUkkAXdjNX68Q==",
            "EMAIL_PASSWORD": "aclv1.6sOVyTDrJIPrEGz9.OGNqFWU3YwWOvKQHFE1KSw==.MoWG7hXG2imCjV0OIuWQ/tqtiAFjWhdRifos8oxrh898di8tj8PSflHfhhdwuuyJ3MiPGvHCewiN/BMl5R2pEHY=",
            "EMAIL_FROM": "aclv1.z+8iuYT2MFONlLBW.dJ7Y69AR/XYY0NzPBT63Zw==.IIk8e4JSdKbLVSNLfpKEw2egreGLiXmZaCHtBwRDLTBrAUpPvMsbgZ9ywdf1TjGVSfmWzN03VN+jw7saKh3XA0QobfYk+Go=",
            "BACKUP_SCHEDULE": "aclv1.73020PkvNZWU6Qer.OIFH+ytqpMJRQBZ1bBmswA==.gMkDZCAip9cEBfiocptHtVrIV/sEJf8vfW9ITBwyUCMSCJJbXkai46jGxPpH/mGFeJGxuk4OuejpuUpmTw==",
            "BACKUP_RETENTION_DAYS": "aclv1.4VoBJOH62wsYyP5L.HsPBbTxAODk+rHuKHUetXw==.Us2VZbXknJ5fajYCOaPty0WJKIsUyck7aTN0iKVShK6GPR8kSwTLYpXs4z265hdDq23C8kv8",
            "BACKUP_PATH": "aclv1.4HbmyAT+AYPCQ0Py.GTeTiT6YcLrAL5EvrdXNOw==.cWP3zzRK8fBIvfy7xlLWmFUv7nrdlhkX8IGrMFg4q4gH5aGTdNccUXLR6HZ2LHlYRBCG0JXyyWLwWQKvFw==",
            "VERCEL": "aclv1.dB3x56DYRxsO+VYy.TizGqWyqFlTu8hvaAKinlg==.HxAAHpjeAobhPIUK5ZEFrdUXAwsovbfHpap59Yf6o1bsKny2QMFFBd8l2zW5kAdnSMzqFCA=",
            "VITE_API_URL": "aclv1.1gK1fdtTiBj5iqG1.BNLljVckBsrnhsxbqlEWbA==.idipcl8XANfBWD/USV6X6H6bIDCgn2Dan7bJgnY9sC8RuLolvzAQe6HxlFrRPJaYpmPm4S8d4S+nmJ0K8kEsMgmg4XaoHtIfNQ==",
            "VITE_AUTH_STORAGE_SECRET": "aclv1.N+xrel00xuKRdp+x.mzDIe28s6csnXigOUyf9nA==.GlyWbvfmyFxSl3N6+ScTjCpfi5J7Y/KWUY/w5dy2r3qOxxealpsuBakrTtArduyGO4RfW6zeGQ38jPLK6EPZ3jYG0AuNGvkaFfVYfKs19QQ="
        };

        let grabadas = 0;
        // Iteramos por las variables exactas permitidas según nuestra configuración
        for (const key of ALLOWED_EXACT_KEYS) {
            // Ignoramos variables core que romperían la app si dependieran de la base de datos para arrancar
            if (key === 'MONGODB_URI' || key === 'MONGO_URI' || key === 'ENCRYPTION_KEY') {
                continue;
            }

            const value = process.env[key] !== undefined ? process.env[key] : DEFAULT_ENV_VALUES[key];

            // Solo subimos si tenemos un valor disponible
            if (value !== undefined) {
                const keyLookup = buildLookupKey('config', key);
                const doc = await EnvironmentConfig.findOne({ keyLookup });

                if (doc) {
                    doc.value = String(value);
                    doc.enabled = true;
                    await doc.save();
                } else {
                    await EnvironmentConfig.create({
                        key,
                        value: String(value),
                        enabled: true
                    });
                }
                grabadas++;
                console.log(`✔️  Variable '${key}' (encubierto) encriptada e insertada/actualizada.`);
            }
        }

        console.log(`\n✅ ¡Seeding de ${grabadas} variables de entorno completado exitosamente!`);
        console.log('🔐 Las claves y valores están totalmente encriptados en la base de datos.\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error sembrando las configuraciones de entorno:', error);
        process.exit(1);
    }
};

seedRuntimeEnv();
