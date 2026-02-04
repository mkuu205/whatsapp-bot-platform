// bot-hosting/src/pairing-helper.js
const { parsePhoneNumber } = require('libphonenumber-js');
const chalk = require('chalk');

class PairingHelper {
    static validatePhoneNumber(phoneNumber) {
        try {
            const parsed = parsePhoneNumber(phoneNumber);
            if (!parsed || !parsed.isValid()) {
                return {
                    valid: false,
                    error: 'Invalid phone number format. Example: +254712345678'
                };
            }
            
            return {
                valid: true,
                formatted: parsed.number,
                countryCode: parsed.countryCallingCode,
                nationalNumber: parsed.nationalNumber
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid phone number format'
            };
        }
    }

    static formatPairingCode(code) {
        if (!code) return '';
        // Format as XXXX-XXXX or similar
        return code.match(/.{1,4}/g)?.join('-') || code;
    }

    static displayPairingInstructions(code) {
        console.log(chalk.bgBlack(chalk.greenBright('\n🤖 PAIRING INSTRUCTIONS 🤖')));
        console.log(chalk.bgBlack(chalk.yellow('──────────────────────────')));
        console.log(chalk.bgBlack(chalk.white('\nYour pairing code:')));
        console.log(chalk.black(chalk.bgGreen(` ${code} `)));
        console.log(chalk.bgBlack(chalk.white('\n1. Open WhatsApp on your phone')));
        console.log(chalk.bgBlack(chalk.white('2. Tap Menu → Linked Devices → Link a Device')));
        console.log(chalk.bgBlack(chalk.white('3. Enter this code: ') + chalk.green(code)));
        console.log(chalk.bgBlack(chalk.white('4. Your bot will be connected in 30 seconds')));
        console.log(chalk.bgBlack(chalk.yellow('──────────────────────────\n')));
    }
}

module.exports = PairingHelper;
